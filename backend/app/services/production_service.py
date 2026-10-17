from __future__ import annotations

from datetime import date, timedelta

from app.schemas.production import (
    DisruptionEvent,
    ProductionConstraintSchema,
    ProductionScheduleSchema,
    ScheduleResponse,
)


_LINE_CAPACITY = {
    "Line Alpha": 85,
    "Line Beta": 76,
    "Line Gamma": 92,
}
_LINE_BATCHES = {
    "Line Alpha": ["BATCH-1042"],
    "Line Beta": ["BATCH-1043"],
    "Line Gamma": ["BATCH-1044"],
}


def recalculate_schedule(event: DisruptionEvent) -> ScheduleResponse:
    line_names = {line.casefold(): line for line in _LINE_CAPACITY}
    affected_line = line_names.get(event.line_id.casefold(), event.line_id)

    line_capacity = dict(_LINE_CAPACITY)
    line_batches = {line: batches.copy() for line, batches in _LINE_BATCHES.items()}
    if affected_line not in line_capacity:
        line_capacity[affected_line] = 80
        normalized_line_id = "".join(
            character if character.isalnum() else "-" for character in affected_line
        ).strip("-").upper()
        line_batches[affected_line] = [f"BATCH-{normalized_line_id or 'UNKNOWN'}"]

    rerouted_target_line = max(
        (line for line in line_capacity if line != affected_line),
        key=lambda line: line_capacity[line],
    )
    rerouted_batch = line_batches[affected_line].pop(0)
    line_batches[rerouted_target_line].append(rerouted_batch)

    rerouted_load_percent = min(30, max(10, event.severity_minutes // 2))
    updated_sequences = []
    for line, nominal_capacity in line_capacity.items():
        is_affected = line == affected_line
        is_target = line == rerouted_target_line
        updated_sequences.append(
            {
                "sequence": len(updated_sequences) + 1,
                "line_id": line,
                "line_status": (
                    "disruption_detected"
                    if is_affected
                    else "absorbing_rerouted_work"
                    if is_target
                    else "operational"
                ),
                "current_active_batches": line_batches[line],
                "capacity_metrics": {
                    "nominal_capacity_percent": nominal_capacity,
                    "available_capacity_percent": (
                        0
                        if is_affected
                        else max(
                            0,
                            nominal_capacity
                            - (rerouted_load_percent if is_target else 0),
                        )
                    ),
                    "rerouted_load_percent": (
                        rerouted_load_percent if is_target else 0
                    ),
                },
                "recovery_actions": (
                    [
                        f"Paused {event.disruption_type.lower()}-affected production.",
                        f"Rerouted {rerouted_batch} to {rerouted_target_line}.",
                    ]
                    if is_affected
                    else [f"Accepted rerouted batch {rerouted_batch}."]
                    if is_target
                    else ["Continue the existing production sequence."]
                ),
            }
        )

    return ScheduleResponse(
        status="success",
        affected_line=affected_line,
        recovery_time_seconds=14,
        rerouted_target_line=rerouted_target_line,
        updated_sequences=updated_sequences,
    )


def optimize_production(request: ProductionConstraintSchema) -> list[ProductionScheduleSchema]:
    material_availability = (
        max(
            0.0,
            (request.material_requirement - request.material_shortage)
            / request.material_requirement,
        )
        if request.material_requirement > 0
        else 1.0
    )
    if not request.material_availability_flag:
        material_availability = 0.0

    planned_quantity = round(
        request.production_capacity
        * request.machine_availability
        * request.operator_skill_factor
        * material_availability,
        2,
    )
    production_line = max(_LINE_CAPACITY, key=_LINE_CAPACITY.get)

    return [
        ProductionScheduleSchema(
            product_id=request.product_id,
            schedule_date=date.today(),
            planned_quantity=planned_quantity,
            production_line=production_line,
            due_date=date.today() + timedelta(days=1),
            priority_level=request.priority_level,
            reschedule_required=(
                request.disruption_flag
                or request.material_shortage > 0
                or request.machine_availability < 1
                or request.operator_skill_factor < 1
            ),
        )
    ]

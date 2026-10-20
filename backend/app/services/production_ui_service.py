from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

from app.schemas.production_ui import (
    DisruptionCreateRequest,
    DisruptionResponse,
    RecoveryPlanCreateRequest,
    RecoveryPlanResponse,
    ScheduleResponse,
    SimulationCreateRequest,
    SimulationResponse,
)


_OBJECTIVE_METRICS = {
    "balanced": (45, 86, 6400),
    "delay": (30, 92, 6650),
    "overtime": (70, 80, 6050),
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp() -> str:
    return _now().isoformat()


def _clock() -> str:
    return _now().strftime("%H:%M")


def _risk_level(score: int) -> str:
    if score >= 75:
        return "High"
    if score >= 45:
        return "Medium"
    return "Low"


class ProductionUIService:
    """Process-local state backing the production dashboard APIs."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._disruptions: list[dict[str, object]] = [
            {
                "id": "fabric",
                "title": "Fabric delivery delay",
                "order": "ORD-2048",
                "line": "Line 02",
                "line_id": "Line Beta",
                "score": 82,
                "level": "High",
                "icon": "▰",
                "forecast": "Next 4 hours",
                "delay": "3 hours",
                "factors": [
                    "Supplier delivery behind schedule",
                    "Low fabric stock",
                    "Order deadline approaching",
                ],
                "product": "Export T-shirts",
                "quantity": "850 pcs",
                "material": "Cotton jersey",
                "severity": 60,
                "description": "Fabric delivery is behind schedule.",
                "status": "active",
                "created_at": _timestamp(),
            },
            {
                "id": "machine",
                "title": "Machine downtime",
                "order": "",
                "line": "Line 04",
                "line_id": "Line Gamma",
                "score": 67,
                "level": "Medium",
                "icon": "⚙",
                "forecast": "Next 2 hours",
                "delay": "1.5 hours",
                "factors": [
                    "Machine vibration above threshold",
                    "Maintenance interval exceeded",
                    "Backup loom available",
                ],
                "product": "Activewear (US)",
                "quantity": "420 pcs",
                "material": "Polyester knit",
                "severity": 45,
                "description": "Machine vibration exceeds the maintenance threshold.",
                "status": "active",
                "created_at": _timestamp(),
            },
            {
                "id": "workforce",
                "title": "Operator shortage",
                "order": "",
                "line": "Line 06",
                "line_id": "Line Gamma",
                "score": 54,
                "level": "Medium",
                "icon": "♟",
                "forecast": "Next shift",
                "delay": "45 minutes",
                "factors": [
                    "Three operators marked absent",
                    "Skill coverage below target",
                    "Cross-trained operators available",
                ],
                "product": "Polo Shirts (Export)",
                "quantity": "310 pcs",
                "material": "Cotton pique",
                "severity": 30,
                "description": "Three operators are marked absent for the next shift.",
                "status": "active",
                "created_at": _timestamp(),
            },
            {
                "id": "resolved-machine",
                "title": "Loom vibration warning",
                "order": "",
                "line": "Line 04",
                "line_id": "Line Gamma",
                "score": 31,
                "level": "Resolved",
                "icon": "⚙",
                "forecast": "Resolved at 09:32",
                "delay": "No production delay",
                "factors": [
                    "Preventive maintenance completed",
                    "Vibration returned to normal",
                    "Line operating within target",
                ],
                "product": "Activewear (US)",
                "quantity": "420 pcs",
                "material": "Polyester knit",
                "severity": 0,
                "description": "Preventive maintenance cleared the warning.",
                "status": "resolved",
                "created_at": _timestamp(),
            },
        ]
        self._simulations: list[dict[str, object]] = []
        self._plans: dict[str, dict[str, object]] = {}
        self._schedule_version = 23
        self._schedule_status = "current"
        self._schedule = self._initial_schedule()
        self._activity_log = [
            {
                "time": "10:15",
                "title": "Fabric delivery delay predicted for ORD-2048",
                "detail": "Line 02 – T-Shirts (EU). Model predicts 2–3 hour delay.",
            },
        ]
        self._execution_status = [
            {
                "name": "Line 02",
                "status": "Maintenance in progress",
                "detail": "Expected to restart at 12:30.",
                "tone": "maintenance",
            },
            {
                "name": "Line 05",
                "status": "Assignment accepted",
                "detail": "New order ORD-2048 confirmed.",
                "tone": "success",
            },
            {
                "name": "Operators",
                "status": "Reallocation confirmed",
                "detail": "Required operators assigned to Line 05.",
                "tone": "success",
            },
        ]
        self._last_applied_plan_id: str | None = None
        self._schedule_before_apply: list[dict[str, object]] | None = None

    @staticmethod
    def _initial_schedule() -> list[dict[str, object]]:
        return [
            {
                "line": "Line 01",
                "department": "Sewing",
                "orders": [
                    {
                        "id": "ORD-2041",
                        "product": "Style A · 1,200 pcs",
                        "start": 4,
                        "width": 34,
                        "type": "scheduled",
                    },
                    {
                        "id": "ORD-2043",
                        "product": "Style B · 980 pcs",
                        "start": 56,
                        "width": 35,
                        "type": "scheduled",
                    },
                ],
            },
            {
                "line": "Line 02",
                "department": "Sewing",
                "orders": [
                    {
                        "id": "ORD-2047",
                        "product": "Style C · 800 pcs",
                        "start": 4,
                        "width": 25,
                        "type": "scheduled",
                    },
                    {
                        "id": "Machine breakdown",
                        "product": "",
                        "start": 29,
                        "width": 18,
                        "type": "downtime",
                    },
                    {
                        "id": "ORD-2048",
                        "product": "Style D · 1,000 pcs",
                        "start": 65,
                        "width": 27,
                        "type": "scheduled",
                    },
                ],
            },
            {
                "line": "Line 05",
                "department": "Finishing",
                "orders": [
                    {
                        "id": "ORD-2052",
                        "product": "Style E · 750 pcs",
                        "start": 84,
                        "width": 16,
                        "type": "scheduled",
                    },
                ],
            },
            {
                "line": "Line 06",
                "department": "Packing",
                "orders": [
                    {
                        "id": "ORD-2050",
                        "product": "Style F · 900 pcs",
                        "start": 7,
                        "width": 32,
                        "type": "scheduled",
                    },
                    {
                        "id": "ORD-2053",
                        "product": "Style G · 1,100 pcs",
                        "start": 62,
                        "width": 37,
                        "type": "scheduled",
                    },
                ],
            },
        ]

    def dashboard(self) -> dict[str, object]:
        with self._lock:
            active_disruptions = sum(
                item["status"] == "active" for item in self._disruptions
            )
            return {
                "synced_at": _clock(),
                "kpis": {
                    "active_lines": 12,
                    "total_lines": 16,
                    "efficiency_percent": 84,
                    "output_pieces": 6240,
                    "target_pieces": 8000,
                    "at_risk_orders": active_disruptions,
                },
                "lines": [
                    {
                        "name": "Line 01",
                        "status": "Running",
                        "order": "ORD-2041",
                        "product": "Polo Shirts (Export)",
                        "target_pieces": 1200,
                        "completed_percent": 72,
                        "output_pieces": 864,
                        "tone": "running",
                    },
                    {
                        "name": "Line 02",
                        "status": "At risk",
                        "order": "ORD-2048",
                        "product": "T-Shirts (EU)",
                        "target_pieces": 850,
                        "completed_percent": 38,
                        "output_pieces": 323,
                        "tone": "risk",
                    },
                    {
                        "name": "Line 03",
                        "status": "Running",
                        "order": "ORD-2050",
                        "product": "Activewear (US)",
                        "target_pieces": 1100,
                        "completed_percent": 68,
                        "output_pieces": 748,
                        "tone": "running",
                    },
                    {
                        "name": "Line 04",
                        "status": "Maintenance",
                        "order": None,
                        "product": "Scheduled maintenance",
                        "target_pieces": 0,
                        "completed_percent": 0,
                        "output_pieces": 0,
                        "tone": "maintenance",
                    },
                ],
                "output_trend": [
                    {"time": f"{hour:02}:00", "actual_pieces": actual, "target_pieces": target}
                    for hour, actual, target in zip(
                        range(8, 19),
                        [120, 860, 1750, 2250, 2700, 3250, 4200, 4750, 5300, 5800, 6240],
                        [100, 900, 1700, 2500, 3300, 4100, 4900, 5700, 6500, 7300, 8000],
                    )
                ],
                "recent_events": [
                    {
                        "time": "10:28",
                        "title": "Line 03 reached 70% target",
                        "detail": "ORD-2050 – Activewear (US). Production is on track.",
                        "tone": "success",
                    },
                    {
                        "time": "10:15",
                        "title": "Fabric delivery delay predicted for ORD-2048",
                        "detail": "Line 02 – T-Shirts (EU). Model predicts 2–3 hour delay.",
                        "tone": "warning",
                    },
                    {
                        "time": "09:50",
                        "title": "Line 04 set to maintenance",
                        "detail": "Scheduled maintenance (10:00 – 14:00). No active order.",
                        "tone": "info",
                    },
                ],
            }

    def list_disruptions(self) -> list[DisruptionResponse]:
        with self._lock:
            return [DisruptionResponse.model_validate(item) for item in self._disruptions]

    def create_disruption(
        self, request: DisruptionCreateRequest
    ) -> DisruptionResponse:
        with self._lock:
            level = _risk_level(request.risk_score)
            record: dict[str, object] = {
                "id": str(uuid4()),
                "title": request.title,
                "order": request.affected_order or "",
                "line": request.line_id,
                "line_id": request.line_id,
                "score": request.risk_score,
                "level": level,
                "icon": "⚙",
                "forecast": request.forecast,
                "delay": f"{request.severity_minutes} minutes",
                "factors": request.factors,
                "product": request.product,
                "quantity": request.quantity,
                "material": request.material,
                "severity": request.severity_minutes,
                "description": request.description,
                "status": "active",
                "created_at": _timestamp(),
            }
            self._disruptions.insert(0, record)
            self._activity_log.insert(
                0,
                {
                    "time": _clock(),
                    "title": f"{request.title} detected on {request.line_id}",
                    "detail": request.description,
                },
            )
            return DisruptionResponse.model_validate(record)

    def resolve_disruption(self, disruption_id: str) -> DisruptionResponse:
        with self._lock:
            disruption = next(
                (item for item in self._disruptions if item["id"] == disruption_id),
                None,
            )
            if disruption is None:
                raise LookupError("Disruption not found.")
            if disruption["status"] == "resolved":
                raise ValueError("Disruption is already resolved.")
            disruption["status"] = "resolved"
            disruption["level"] = "Resolved"
            disruption["delay"] = "No production delay"
            self._activity_log.insert(
                0,
                {
                    "time": _clock(),
                    "title": f"{disruption['title']} resolved",
                    "detail": f"{disruption['line']} returned to monitored operation.",
                },
            )
            return DisruptionResponse.model_validate(disruption)

    def run_simulation(
        self, request: SimulationCreateRequest
    ) -> SimulationResponse:
        with self._lock:
            severity_factor = {
                "Low": 0.2,
                "Medium": 0.4,
                "High": 0.7,
                "Critical": 0.9,
            }[request.severity]
            recovered_minutes = round(request.duration_minutes * (1 - severity_factor))
            projected_output = max(
                0,
                min(
                    100,
                    100
                    - round(severity_factor * 35)
                    - request.unavailable_machines * 5,
                ),
            )
            tone = "recovered" if projected_output >= 50 else "partial"
            record: dict[str, object] = {
                "id": str(uuid4()),
                "title": request.disruption_type,
                "order": request.affected_order,
                "detail": f"{request.duration_minutes} min",
                "date": f"Today, {request.start_time}",
                "result": "Recovered" if tone == "recovered" else "Partial recovery",
                "tone": tone,
                "scenario_name": request.scenario_name,
                "disruption_type": request.disruption_type,
                "production_line": request.production_line,
                "start_time": request.start_time,
                "duration_minutes": request.duration_minutes,
                "severity": request.severity,
                "unavailable_machines": request.unavailable_machines,
                "notes": request.notes,
                "estimated_delay_recovered_minutes": recovered_minutes,
                "projected_output_percent": projected_output,
                "sandbox_only": True,
                "created_at": _timestamp(),
            }
            self._simulations.insert(0, record)
            return SimulationResponse.model_validate(record)

    def list_simulations(self) -> list[SimulationResponse]:
        with self._lock:
            return [SimulationResponse.model_validate(item) for item in self._simulations]

    def create_recovery_plan(
        self, request: RecoveryPlanCreateRequest
    ) -> RecoveryPlanResponse:
        with self._lock:
            disruption = self._find_disruption(request.disruption_id)
            source_line = str(disruption["line"])
            order_id = str(disruption["order"] or "ORD-2048")
            destination_line = "Line 05" if source_line != "Line 05" else "Line 02"
            delay, utilization, output = _OBJECTIVE_METRICS[request.objective]
            plan_id = str(uuid4())
            plan: dict[str, object] = {
                "plan_id": plan_id,
                "disruption_id": str(disruption["id"]),
                "objective": request.objective,
                "status": "proposed",
                "source_line": source_line,
                "destination_line": destination_line,
                "order_id": order_id,
                "estimated_delay_minutes": delay,
                "line_utilization_percent": utilization,
                "projected_output_pieces": output,
                "recovery_time_seconds": 14,
                "allow_overtime": request.allow_overtime,
                "protect_priority_orders": request.protect_priority_orders,
                "actions": [
                    {
                        "title": f"Move {order_id} to {destination_line}",
                        "detail": "Transfer the affected order to available production capacity.",
                    },
                    {
                        "title": "Resequence remaining production",
                        "detail": "Recalculate the line sequence against current order priorities.",
                    },
                    {
                        "title": "Confirm operator allocation",
                        "detail": f"Check skill availability for {destination_line}.",
                    },
                ],
                "constraint_checks": [
                    {"title": "Skills verified", "detail": "Required operator skills available"},
                    {"title": "Capacity checked", "detail": f"{destination_line} has capacity"},
                    {"title": "Material available", "detail": "Material availability checked"},
                    {
                        "title": "Shift limits respected",
                        "detail": (
                            "Overtime allowed by selected constraints"
                            if request.allow_overtime
                            else "No overtime permitted"
                        ),
                    },
                ],
                "created_at": _timestamp(),
                "applied_at": None,
            }
            self._plans[plan_id] = plan
            return RecoveryPlanResponse.model_validate(plan)

    def get_recovery_plan(self, plan_id: str) -> RecoveryPlanResponse:
        with self._lock:
            plan = self._plans.get(plan_id)
            if plan is None:
                raise LookupError("Recovery plan not found.")
            return RecoveryPlanResponse.model_validate(plan)

    def apply_recovery_plan(self, plan_id: str) -> RecoveryPlanResponse:
        with self._lock:
            plan = self._plans.get(plan_id)
            if plan is None:
                raise LookupError("Recovery plan not found.")
            if plan["status"] != "proposed":
                raise ValueError("Only a proposed recovery plan can be applied.")
            if self._last_applied_plan_id is not None:
                last_plan = self._plans[self._last_applied_plan_id]
                if last_plan["status"] == "applied":
                    raise ValueError("Roll back the currently applied plan first.")

            source_line = str(plan["source_line"])
            destination_line = str(plan["destination_line"])
            order_id = str(plan["order_id"])
            source = next(
                (line for line in self._schedule if line["line"] == source_line),
                None,
            )
            destination = next(
                (line for line in self._schedule if line["line"] == destination_line),
                None,
            )
            if source is None or destination is None:
                raise ValueError(
                    "The recovery plan references a line that is not in the active schedule."
                )
            source_orders = source["orders"]
            destination_orders = destination["orders"]
            matching_order = next(
                (
                    order
                    for order in source_orders
                    if order["id"] == order_id
                ),
                None,
            )
            if matching_order is None:
                raise ValueError(
                    f"Order {order_id} is not assigned to {source_line} in the active schedule."
                )

            self._schedule_before_apply = deepcopy(self._schedule)
            source_orders.remove(matching_order)
            original_slot = deepcopy(matching_order)
            original_slot["type"] = "original"
            source_orders.append(original_slot)
            moved_order = deepcopy(matching_order)
            moved_order["start"] = 52
            moved_order["width"] = 31
            moved_order["type"] = "moved"
            destination_orders.append(moved_order)
            self._schedule_version += 1
            self._schedule_status = "recovery_applied"
            self._last_applied_plan_id = plan_id
            plan["status"] = "applied"
            plan["applied_at"] = _timestamp()
            now = _clock()
            self._activity_log.insert(
                0,
                {
                    "time": now,
                    "title": f"Recovery plan applied to {order_id}",
                    "detail": f"Order rerouted from {source_line} to {destination_line}.",
                },
            )
            self._execution_status = [
                {
                    "name": source_line,
                    "status": "Work rerouted",
                    "detail": f"{order_id} moved to {destination_line}.",
                    "tone": "success",
                },
                {
                    "name": destination_line,
                    "status": "Assignment accepted",
                    "detail": f"Order {order_id} assigned.",
                    "tone": "success",
                },
                {
                    "name": "Operators",
                    "status": "Reallocation confirmed",
                    "detail": f"Allocation checked for {destination_line}.",
                    "tone": "success",
                },
            ]
            return RecoveryPlanResponse.model_validate(plan)

    def get_schedule(self) -> ScheduleResponse:
        with self._lock:
            return ScheduleResponse(
                version=self._schedule_version,
                status=self._schedule_status,
                schedule=deepcopy(self._schedule),
                activity_log=deepcopy(self._activity_log),
                execution_status=deepcopy(self._execution_status),
                last_applied_plan_id=self._last_applied_plan_id,
            )

    def rollback_schedule(self) -> ScheduleResponse:
        with self._lock:
            if (
                self._last_applied_plan_id is None
                or self._schedule_before_apply is None
                or self._plans[self._last_applied_plan_id]["status"] != "applied"
            ):
                raise ValueError("There is no applied recovery plan to roll back.")
            self._schedule = self._schedule_before_apply
            self._schedule_before_apply = None
            plan = self._plans[self._last_applied_plan_id]
            plan["status"] = "rolled_back"
            self._schedule_version += 1
            self._schedule_status = "rolled_back"
            now = _clock()
            self._activity_log.insert(
                0,
                {
                    "time": now,
                    "title": "Recovery plan rolled back",
                    "detail": "The previous production schedule was restored.",
                },
            )
            self._execution_status = [
                {
                    "name": str(plan["source_line"]),
                    "status": "Original assignment restored",
                    "detail": f"{plan['order_id']} returned to its original slot.",
                    "tone": "success",
                },
                {
                    "name": str(plan["destination_line"]),
                    "status": "Assignment released",
                    "detail": "No reassigned order remains on this line.",
                    "tone": "info",
                },
                {
                    "name": "Operators",
                    "status": "Original allocation restored",
                    "detail": "Previous operator allocation restored.",
                    "tone": "success",
                },
            ]
            return self.get_schedule()

    def _find_disruption(self, disruption_id: str | None) -> dict[str, object]:
        if disruption_id is None:
            disruption = next(
                (
                    item
                    for item in self._disruptions
                    if item["status"] == "active" and item["order"]
                ),
                None,
            )
        else:
            disruption = next(
                (
                    item
                    for item in self._disruptions
                    if item["id"] == disruption_id
                ),
                None,
            )
        if disruption is None:
            raise LookupError("Active disruption not found.")
        if disruption["status"] != "active":
            raise ValueError("A recovery plan cannot be created for a resolved disruption.")
        return disruption


production_ui_service = ProductionUIService()

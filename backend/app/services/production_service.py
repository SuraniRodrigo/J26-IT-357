from __future__ import annotations

from datetime import date, timedelta

from app.schemas.production import ProductionConstraintSchema, ProductionScheduleSchema


def optimize_production(request: ProductionConstraintSchema) -> list[ProductionScheduleSchema]:
    if request.production_capacity < 0:
        raise ValueError("Production capacity cannot be negative.")

    return [
        ProductionScheduleSchema(
            product_id=request.product_id,
            schedule_date=date.today(),
            planned_quantity=0.0,
            production_line="not-assigned",
            due_date=date.today() + timedelta(days=1),
            priority_level=request.priority_level,
            reschedule_required=request.disruption_flag,
        )
    ]

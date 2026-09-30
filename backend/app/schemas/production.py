from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class ProductionConstraintSchema(BaseModel):
    product_id: str
    material_requirement: float = Field(..., ge=0)
    material_shortage: float = Field(..., ge=0)
    material_availability_flag: bool
    machine_availability: float = Field(..., ge=0, le=1)
    operator_skill_factor: float = Field(..., ge=0, le=1)
    production_capacity: float = Field(..., ge=0)
    disruption_flag: bool = False
    priority_level: int = Field(default=1, ge=1, le=5)


class ProductionScheduleSchema(BaseModel):
    product_id: str
    schedule_date: date
    planned_quantity: float = Field(..., ge=0)
    production_line: str
    due_date: date
    priority_level: int = Field(default=1, ge=1, le=5)
    reschedule_required: bool = False

from __future__ import annotations

from datetime import date

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class DisruptionEvent(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    line_id: str = Field(..., min_length=1)
    disruption_type: str = Field(..., min_length=1)
    severity_minutes: int = Field(..., ge=0)


class ScheduleResponse(BaseModel):
    status: Literal["success", "healing_active"]
    affected_line: str
    recovery_time_seconds: int = Field(default=14, ge=0)
    rerouted_target_line: str
    updated_sequences: list[dict[str, Any]]


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

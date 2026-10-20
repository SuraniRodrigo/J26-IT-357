from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class DisruptionCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    line_id: str = Field(..., min_length=1, max_length=60)
    disruption_type: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    risk_score: int = Field(default=50, ge=0, le=100)
    severity_minutes: int = Field(..., ge=0, le=1440)
    affected_order: str | None = Field(default=None, max_length=60)
    forecast: str = Field(default="Now", max_length=80)
    product: str = Field(default="Unassigned production", max_length=120)
    quantity: str = Field(default="—", max_length=40)
    material: str = Field(default="—", max_length=100)
    factors: list[str] = Field(default_factory=list, max_length=10)


class DisruptionResponse(BaseModel):
    id: str
    title: str
    order: str
    line: str
    line_id: str
    score: int
    level: Literal["High", "Medium", "Low", "Resolved"]
    icon: str
    forecast: str
    delay: str
    factors: list[str]
    product: str
    quantity: str
    material: str
    severity: int
    description: str
    status: Literal["active", "resolved"]
    created_at: str


class SimulationCreateRequest(BaseModel):
    scenario_name: str = Field(..., min_length=1, max_length=120)
    disruption_type: str = Field(..., min_length=1, max_length=100)
    production_line: str = Field(..., min_length=1, max_length=60)
    affected_order: str = Field(..., min_length=1, max_length=60)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int = Field(..., gt=0, le=1440)
    severity: Literal["Low", "Medium", "High", "Critical"]
    unavailable_machines: int = Field(default=0, ge=0, le=50)
    notes: str = Field(default="", max_length=1000)


class SimulationResponse(BaseModel):
    id: str
    title: str
    order: str
    detail: str
    date: str
    result: str
    tone: Literal["recovered", "partial"]
    scenario_name: str
    disruption_type: str
    production_line: str
    start_time: str
    duration_minutes: int
    severity: str
    unavailable_machines: int
    notes: str
    estimated_delay_recovered_minutes: int
    projected_output_percent: int
    sandbox_only: bool
    created_at: str


class RecoveryPlanCreateRequest(BaseModel):
    disruption_id: str | None = None
    objective: Literal["balanced", "delay", "overtime"] = "balanced"
    allow_overtime: bool = True
    protect_priority_orders: bool = True


class RecoveryPlanResponse(BaseModel):
    plan_id: str
    disruption_id: str
    objective: Literal["balanced", "delay", "overtime"]
    status: Literal["proposed", "applied", "rolled_back"]
    source_line: str
    destination_line: str
    order_id: str
    estimated_delay_minutes: int
    line_utilization_percent: int
    projected_output_pieces: int
    recovery_time_seconds: int
    actions: list[dict[str, str]]
    constraint_checks: list[dict[str, str]]
    created_at: str
    applied_at: str | None


class ScheduleResponse(BaseModel):
    version: int
    status: Literal["current", "recovery_applied", "rolled_back"]
    schedule: list[dict[str, Any]]
    activity_log: list[dict[str, str]]
    execution_status: list[dict[str, str]]
    last_applied_plan_id: str | None

from __future__ import annotations

from datetime import date

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class ProductionJobSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    order_id: str = Field(..., min_length=1)
    product_id: str = Field(..., min_length=1)
    product_family: str = Field(..., min_length=1)
    cutting_minutes: int = Field(..., ge=1)
    sewing_minutes: int = Field(..., ge=1)
    finishing_minutes: int = Field(..., ge=1)
    due_time_minutes: int = Field(..., ge=0)
    sewing_workers: int = Field(default=1, ge=1)
    eligible_sewing_lines: list[str] = Field(default_factory=list)
    machine_disruption_probability: float = Field(default=0, ge=0, le=1)
    material_disruption_probability: float = Field(default=0, ge=0, le=1)
    order_disruption_probability: float = Field(default=0, ge=0, le=1)
    machine_delay_minutes: int = Field(default=0, ge=0)
    material_delay_minutes: int = Field(default=0, ge=0)
    order_delay_minutes: int = Field(default=0, ge=0)


class ProductionScheduleRequest(BaseModel):
    orders: list[ProductionJobSchema] = Field(..., min_length=1, max_length=100)
    sewing_lines: list[str] = Field(..., min_length=1)
    cutting_machines: int = Field(default=1, ge=1)
    finishing_machines: int = Field(default=1, ge=1)
    sewing_workers_per_line: int = Field(default=12, ge=1)
    total_sewing_workers: int = Field(default=36, ge=1)
    sewing_line_disruption_probabilities: dict[str, float] = Field(default_factory=dict)
    changeover_times: dict[str, dict[str, int]] = Field(default_factory=dict)
    disruption_threshold: float = Field(default=0.46, gt=0, le=1)
    max_time_seconds: float = Field(default=10, gt=0, le=60)

    @field_validator("sewing_lines")
    @classmethod
    def validate_sewing_lines(cls, lines: list[str]) -> list[str]:
        normalized = [line.strip() for line in lines]
        if any(not line for line in normalized):
            raise ValueError("Sewing line names must not be empty")
        if len(set(normalized)) != len(normalized):
            raise ValueError("Sewing line names must be unique")
        return normalized

    @field_validator("sewing_line_disruption_probabilities")
    @classmethod
    def validate_line_probabilities(
        cls, probabilities: dict[str, float]
    ) -> dict[str, float]:
        if any(not 0 <= probability <= 1 for probability in probabilities.values()):
            raise ValueError("Sewing line disruption probabilities must be between 0 and 1")
        return probabilities

    @field_validator("changeover_times")
    @classmethod
    def validate_changeover_times(
        cls, changeovers: dict[str, dict[str, int]]
    ) -> dict[str, dict[str, int]]:
        if any(minutes < 0 for targets in changeovers.values() for minutes in targets.values()):
            raise ValueError("Changeover times must be non-negative")
        return changeovers


class GanttOperationSchema(BaseModel):
    order_id: str
    product_id: str
    stage: Literal["cutting", "sewing", "finishing"]
    start_minute: int = Field(..., ge=0)
    end_minute: int = Field(..., ge=1)
    duration_minutes: int = Field(..., ge=1)
    resource: str
    workers: int = Field(default=1, ge=1)


class ProductionOptimizationResponse(BaseModel):
    status: Literal["OPTIMAL", "FEASIBLE"]
    healing_triggered: bool
    disruption_threshold: float
    makespan_minutes: int
    total_tardiness_minutes: int
    changeover_cost_minutes: int
    sewing_line_assignments: dict[str, str]
    gantt_schedule: list[GanttOperationSchema]


class GeneticProductionScheduleRequest(ProductionScheduleRequest):
    makespan_weight: float = Field(default=1.0, ge=0)
    tardiness_weight: float = Field(default=1.0, ge=0)
    disruption_risk_weight: float = Field(default=1.0, ge=0)
    population_size: int = Field(default=40, ge=4, le=200)
    generations: int = Field(default=60, ge=1, le=1000)
    tournament_size: int = Field(default=3, ge=2, le=10)
    crossover_probability: float = Field(default=0.85, ge=0, le=1)
    mutation_probability: float = Field(default=0.15, ge=0, le=1)
    seed: int = 42
    telemetry_bottleneck_risk_probabilities: dict[str, float] = Field(
        default_factory=dict
    )

    @field_validator("telemetry_bottleneck_risk_probabilities")
    @classmethod
    def validate_telemetry_probabilities(
        cls, probabilities: dict[str, float]
    ) -> dict[str, float]:
        if any(not 0 <= probability <= 1 for probability in probabilities.values()):
            raise ValueError("Telemetry bottleneck probabilities must be between 0 and 1")
        return probabilities


class GeneticScheduleBenchmarkSchema(BaseModel):
    makespan_minutes: int = Field(..., ge=0)
    total_tardiness_minutes: int = Field(..., ge=0)
    disruption_risk_minutes: float = Field(..., ge=0)
    fitness: float = Field(..., ge=0)
    runtime_seconds: float = Field(..., ge=0)


class GeneticProductionScheduleResponse(BaseModel):
    algorithm: Literal["genetic_algorithm"]
    generations_completed: int = Field(..., ge=0)
    dynamic_reoptimization_triggered: bool
    dynamic_trigger_sources: list[str]
    effective_crossover_probability: float = Field(..., ge=0, le=1)
    effective_mutation_probability: float = Field(..., ge=0, le=1)
    makespan_minutes: int = Field(..., ge=0)
    total_tardiness_minutes: int = Field(..., ge=0)
    disruption_risk_minutes: float = Field(..., ge=0)
    fitness: float = Field(..., ge=0)
    fitness_improvement_vs_spt_percent: float = Field(..., ge=0)
    runtime_seconds: float = Field(..., ge=0)
    sewing_line_assignments: dict[str, str]
    gantt_schedule: list[GanttOperationSchema]
    spt_benchmark: GeneticScheduleBenchmarkSchema

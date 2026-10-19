from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.production import (
    DisruptionEvent,
    GeneticProductionScheduleRequest,
    GeneticProductionScheduleResponse,
    ProductionConstraintSchema,
    ProductionOptimizationResponse,
    ProductionScheduleRequest,
    ProductionScheduleSchema,
    ScheduleResponse,
)
from app.services.genetic_scheduler import GeneticProductionScheduler
from app.services.jssp_scheduler import SelfHealingJSSPScheduler
from app.services.production_service import optimize_production, recalculate_schedule

router = APIRouter(tags=["production"])
scheduler = SelfHealingJSSPScheduler()
genetic_scheduler = GeneticProductionScheduler()


@router.post(
    "/production/schedule/genetic",
    response_model=GeneticProductionScheduleResponse,
)
def genetic_production_schedule(
    request: GeneticProductionScheduleRequest,
) -> GeneticProductionScheduleResponse:
    try:
        return genetic_scheduler.solve_and_optimize(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/production/schedule", response_model=ProductionOptimizationResponse)
def production_schedule(
    request: ProductionScheduleRequest,
) -> ProductionOptimizationResponse:
    try:
        return scheduler.solve_and_optimize(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/production/optimize", response_model=list[ProductionScheduleSchema])
def production_optimize(request: ProductionConstraintSchema) -> list[ProductionScheduleSchema]:
    try:
        return optimize_production(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/v1/optimizer/recalculate", response_model=ScheduleResponse)
def optimizer_recalculate(event: DisruptionEvent) -> ScheduleResponse:
    return recalculate_schedule(event)

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.production import (
    DisruptionEvent,
    ProductionConstraintSchema,
    ProductionScheduleSchema,
    ScheduleResponse,
)
from app.services.production_service import optimize_production, recalculate_schedule

router = APIRouter(tags=["production"])


@router.post("/production/optimize", response_model=list[ProductionScheduleSchema])
def production_optimize(request: ProductionConstraintSchema) -> list[ProductionScheduleSchema]:
    try:
        return optimize_production(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/v1/optimizer/recalculate", response_model=ScheduleResponse)
def optimizer_recalculate(event: DisruptionEvent) -> ScheduleResponse:
    return recalculate_schedule(event)

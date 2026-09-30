from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.production import ProductionConstraintSchema, ProductionScheduleSchema
from app.services.production_service import optimize_production

router = APIRouter(tags=["production"])


@router.post("/production/optimize", response_model=list[ProductionScheduleSchema])
def production_optimize(request: ProductionConstraintSchema) -> list[ProductionScheduleSchema]:
    try:
        return optimize_production(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.demand import DemandForecastRequest, DemandForecastSchema
from app.services.demand_service import generate_forecast

router = APIRouter(tags=["demand"])


@router.post("/demand/forecast", response_model=list[DemandForecastSchema])
def demand_forecast(request: DemandForecastRequest) -> list[DemandForecastSchema]:
    try:
        return generate_forecast(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

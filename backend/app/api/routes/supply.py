from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.supply import SupplyRiskRequest, SupplyRiskSchema
from app.services.supply_service import predict_supply_risk

router = APIRouter(tags=["supply"])


@router.post("/supply/predict", response_model=list[SupplyRiskSchema])
def supply_predict(request: SupplyRiskRequest) -> list[SupplyRiskSchema]:
    try:
        return predict_supply_risk(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.supply import SupplyPredictionRequest, SupplyPredictionResponse
from app.services.supply.supply_service import predict_supply_risk

router = APIRouter(tags=["supply"])


@router.post("/supply/predict")
def supply_predict(request: SupplyPredictionRequest) -> SupplyPredictionResponse:
    try:
        return predict_supply_risk(request)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

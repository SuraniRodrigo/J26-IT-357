from __future__ import annotations

from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.models import SupplyRiskRecord
from app.database.session import get_db
from app.repositories.supply_repository import SupplyRepository
from app.schemas.supply import (
    SupplyPredictionRequest,
    SupplyPredictionResponse,
    SupplyRiskHistoryItem,
)
from app.services.supply.supply_service import predict_supply_risk

router = APIRouter(tags=["supply"])


@router.post("/supply/predict", response_model=SupplyPredictionResponse)
def supply_predict(
    request: SupplyPredictionRequest,
    db: Session = Depends(get_db),
) -> SupplyPredictionResponse:
    try:
        prediction = predict_supply_risk(request)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    risk_record = SupplyRiskRecord(
        supplier_id=None,
        vendor_id=None,
        disruption_probability=round(prediction.disruption_probability_percent / 100.0, 4),
        risk_level=prediction.risk_level,
        model_version="xgboost-v1.0",
    )
    repo = SupplyRepository(db)
    repo.create(risk_record)

    return prediction


@router.get("/supply/history", response_model=list[SupplyRiskHistoryItem])
def supply_history(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> Sequence[SupplyRiskRecord]:
    repo = SupplyRepository(db)
    return repo.list_recent(limit=limit)


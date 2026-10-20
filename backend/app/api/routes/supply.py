import csv
import io
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database.models import SupplyRiskRecord
from app.database.session import get_db
from app.repositories.supply_repository import SupplyRepository
from app.schemas.supply import (
    LatestSupplyRiskResponse,
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


@router.get("/api/supply/history", response_model=list[SupplyRiskHistoryItem], include_in_schema=False)
def supply_history_alias(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> Sequence[SupplyRiskRecord]:
    return supply_history(limit=limit, db=db)


@router.get("/supply/export")
def supply_export(db: Session = Depends(get_db)) -> Response:
    repo = SupplyRepository(db)
    records = repo.list_all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id",
        "supplier_id",
        "disruption_probability",
        "risk_level",
        "model_version",
        "created_at",
    ])

    for r in records:
        created_at_val = getattr(r, "created_at", None)
        if created_at_val is None:
            created_at_str = ""
        elif hasattr(created_at_val, "strftime"):
            created_at_str = created_at_val.strftime("%Y-%m-%d %H:%M:%S")
        else:
            created_at_str = str(created_at_val)

        writer.writerow([
            r.id,
            r.supplier_id or "",
            r.disruption_probability,
            r.risk_level,
            r.model_version,
            created_at_str,
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="supplier_risk_report.csv"'},
    )


@router.get("/supply/latest-risk", response_model=LatestSupplyRiskResponse)
def supply_latest_risk(
    db: Session = Depends(get_db),
) -> LatestSupplyRiskResponse:
    repo = SupplyRepository(db)
    record = repo.get_latest()

    if record is not None:
        prob = float(record.disruption_probability)
        prob_percent = round(prob * 100, 2)
        return LatestSupplyRiskResponse(
            supplier_id=record.supplier_id,
            vendor_id=record.vendor_id,
            disruption_probability=prob,
            disruption_probability_percent=prob_percent,
            supplier_trust_score=round((1.0 - prob) * 100, 2),
            risk_level=record.risk_level,
            early_warning_alert=prob >= 0.5,
            model_version=record.model_version,
            valid_upstream_risk_signal=True,
            created_at=record.created_at,
        )

    return LatestSupplyRiskResponse(
        supplier_id=None,
        vendor_id=None,
        disruption_probability=0.0,
        disruption_probability_percent=0.0,
        supplier_trust_score=100.0,
        risk_level="low",
        early_warning_alert=False,
        model_version="xgboost-v1.0",
        valid_upstream_risk_signal=False,
        created_at=None,
    )



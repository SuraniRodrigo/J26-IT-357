import csv
import io
import random
from datetime import datetime, timezone
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database.models import SupplyRiskRecord
from app.database.session import get_db
from app.repositories.supply_repository import SupplyRepository
from app.schemas.supply import (
    LatestSupplyRiskResponse,
    PortWeatherRisk,
    RouteWeatherRiskResponse,
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
        supplier_id=request.supplier_name,
        vendor_id=request.product_name,
        disruption_probability=round(prediction.risk_score / 100.0, 4),
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
            supplier_trust_score=round(100.0 - prob_percent, 2),
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


_PORT_TEMPLATES = [
    {
        "port_name": "Colombo Port",
        "country": "Sri Lanka",
        "conditions": [
            ("Monsoon – Heavy Rainfall", 72, "High", 36, "DISRUPTED"),
            ("Intermittent Showers", 48, "Medium", 12, "WATCH"),
            ("Clear Skies", 10, "Low", 0, "CLEAR"),
        ],
    },
    {
        "port_name": "Shanghai Port",
        "country": "China",
        "conditions": [
            ("Typhoon Warning", 91, "High", 72, "DISRUPTED"),
            ("Strong Winds", 55, "Medium", 18, "WATCH"),
            ("Partly Cloudy", 14, "Low", 2, "CLEAR"),
        ],
    },
    {
        "port_name": "Ningbo-Zhoushan",
        "country": "China",
        "conditions": [
            ("Fog & Reduced Visibility", 63, "High", 24, "DISRUPTED"),
            ("Overcast", 37, "Medium", 8, "WATCH"),
            ("Clear & Calm", 8, "Low", 0, "CLEAR"),
        ],
    },
    {
        "port_name": "Chittagong Port",
        "country": "Bangladesh",
        "conditions": [
            ("Cyclone Advisory", 84, "High", 48, "DISRUPTED"),
            ("Pre-monsoon Squalls", 52, "Medium", 16, "WATCH"),
            ("Humid but Clear", 18, "Low", 1, "CLEAR"),
        ],
    },
]


@router.get("/supply/weather-risk", response_model=RouteWeatherRiskResponse)
def supply_weather_risk() -> RouteWeatherRiskResponse:
    """Return real-time-style shipping route & port weather risk telemetry.

    The response is deterministically seeded by the current UTC hour so
    values visibly rotate throughout the day without any external API
    dependencies.
    """
    now_utc = datetime.now(timezone.utc)
    seed = now_utc.year * 1_000_000 + now_utc.month * 10_000 + now_utc.day * 100 + now_utc.hour
    rng = random.Random(seed)

    ports: list[PortWeatherRisk] = []
    worst_score = 0

    for template in _PORT_TEMPLATES:
        # Each hour pick one of the three condition tiers at weighted probability
        condition = rng.choices(
            template["conditions"],
            weights=[20, 35, 45],  # DISRUPTED / WATCH / CLEAR probabilities
            k=1,
        )[0]
        weather_condition, typhoon_score, congestion, delay_hours, status_badge = condition

        ports.append(
            PortWeatherRisk(
                port_name=template["port_name"],
                country=template["country"],
                weather_condition=weather_condition,
                typhoon_monsoon_risk_score=typhoon_score,
                port_congestion_level=congestion,
                estimated_delay_hours=delay_hours,
                status_badge=status_badge,
            )
        )
        if typhoon_score > worst_score:
            worst_score = typhoon_score

    if worst_score >= 60:
        overall = "HIGH"
    elif worst_score >= 35:
        overall = "MEDIUM"
    else:
        overall = "LOW"

    return RouteWeatherRiskResponse(
        generated_at=now_utc,
        overall_risk_level=overall,
        ports=ports,
    )


import calendar
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


# ---------------------------------------------------------------------------
# POST /supply/predict
# ---------------------------------------------------------------------------

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
        # Extended product-wise / period-wise fields
        product_name=request.product_name,
        category_name=request.category_name,
        supplier_name=request.supplier_name,
        year=request.year,
        month=request.month,
        expected_delay_days=request.expected_delay_days,
        shipping_mode=request.shipping_mode,
        order_region=request.order_region,
        risk_score=prediction.risk_score,
        trust_score=prediction.trust_score,
    )
    repo = SupplyRepository(db)
    repo.create(risk_record)

    return prediction


# ---------------------------------------------------------------------------
# GET /supply/history
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# GET /supply/export  (CSV or PDF)
# ---------------------------------------------------------------------------

_CSV_HEADERS = [
    "Timestamp",
    "Product Name",
    "Category Name",
    "Supplier Name",
    "Year",
    "Delivery Month",
    "Expected Delay (Days)",
    "Shipping Mode",
    "Order Region",
    "Risk Score (%)",
    "Trust Score (%)",
    "Risk Level",
]


def _month_name(month: int | None) -> str:
    if month is None or not (1 <= month <= 12):
        return "—"
    return calendar.month_name[month]


def _row_values(r: SupplyRiskRecord) -> list:
    created_at_str = ""
    if r.created_at is not None:
        if hasattr(r.created_at, "strftime"):
            created_at_str = r.created_at.strftime("%Y-%m-%d %H:%M:%S")
        else:
            created_at_str = str(r.created_at)

    prob = float(r.disruption_probability)
    risk_pct = round((r.risk_score if r.risk_score is not None else prob * 100), 2)
    trust_pct = round((r.trust_score if r.trust_score is not None else 100.0 - risk_pct), 2)

    return [
        created_at_str,
        r.product_name or r.vendor_id or "—",
        r.category_name or "—",
        r.supplier_name or r.supplier_id or "—",
        str(r.year) if r.year else "—",
        _month_name(r.month),
        str(r.expected_delay_days) if r.expected_delay_days is not None else "0",
        r.shipping_mode or "—",
        r.order_region or "—",
        f"{risk_pct:.2f}",
        f"{trust_pct:.2f}",
        r.risk_level,
    ]


def _build_csv(records: Sequence[SupplyRiskRecord]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(_CSV_HEADERS)
    for r in records:
        writer.writerow(_row_values(r))
    return output.getvalue()


def _build_pdf(records: Sequence[SupplyRiskRecord]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import (
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20,
        title="OptiChain — Supplier Risk Audit Report",
        author="OptiChain Procurement Guardian",
    )

    # ---- Brand palette ----
    BRAND_DARK   = colors.HexColor("#0f172a")   # slate-900
    BRAND_ACCENT = colors.HexColor("#6366f1")   # indigo-500
    ACCENT_LIGHT = colors.HexColor("#e0e7ff")   # indigo-100
    HIGH_RED     = colors.HexColor("#ef4444")
    MED_AMBER    = colors.HexColor("#f59e0b")
    LOW_GREEN    = colors.HexColor("#10b981")
    ROW_ALT      = colors.HexColor("#f8fafc")
    BORDER       = colors.HexColor("#e2e8f0")
    WHITE        = colors.white

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "h1", parent=styles["Normal"],
        fontSize=18, textColor=WHITE, fontName="Helvetica-Bold",
        alignment=TA_LEFT, spaceAfter=2,
    )
    subtitle_st = ParagraphStyle(
        "subtitle", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#c7d2fe"),
        fontName="Helvetica", alignment=TA_LEFT,
    )
    meta_st = ParagraphStyle(
        "meta", parent=styles["Normal"],
        fontSize=8, textColor=colors.HexColor("#94a3b8"),
        fontName="Helvetica",
    )
    cell_st = ParagraphStyle(
        "cell", parent=styles["Normal"],
        fontSize=7.5, textColor=BRAND_DARK,
        fontName="Helvetica", leading=9, alignment=TA_CENTER,
    )
    cell_left_st = ParagraphStyle(
        "cell_left", parent=styles["Normal"],
        fontSize=7.5, textColor=BRAND_DARK,
        fontName="Helvetica", leading=9, alignment=TA_LEFT,
    )
    header_cell_st = ParagraphStyle(
        "hcell", parent=styles["Normal"],
        fontSize=7.5, textColor=WHITE,
        fontName="Helvetica-Bold", alignment=TA_CENTER, leading=9,
    )
    rl_styles = {
        "high": ParagraphStyle("rl_high", parent=styles["Normal"], fontSize=7.5, textColor=HIGH_RED, fontName="Helvetica-Bold", alignment=TA_CENTER, leading=9),
        "medium": ParagraphStyle("rl_med", parent=styles["Normal"], fontSize=7.5, textColor=MED_AMBER, fontName="Helvetica-Bold", alignment=TA_CENTER, leading=9),
        "low": ParagraphStyle("rl_low", parent=styles["Normal"], fontSize=7.5, textColor=LOW_GREEN, fontName="Helvetica-Bold", alignment=TA_CENTER, leading=9),
    }

    # --- Summary metrics ---
    total = len(records)
    high_cnt  = sum(1 for r in records if r.risk_level == "high")
    med_cnt   = sum(1 for r in records if r.risk_level == "medium")
    low_cnt   = sum(1 for r in records if r.risk_level == "low")
    avg_risk  = (
        sum((r.risk_score or r.disruption_probability * 100) for r in records) / total
        if total else 0.0
    )
    avg_trust = round(100.0 - avg_risk, 2)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    story = []

    # ---- Header banner (800pt width matching table) ----
    banner_data = [[
        Paragraph("🔗 OptiChain — Procurement Guardian", h1),
        Paragraph("Supplier Risk Audit Report", subtitle_st),
        Paragraph(f"Generated: {generated_at}", meta_st),
    ]]
    banner_col_w = [470, 180, 150]
    banner = Table(banner_data, colWidths=banner_col_w)
    banner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_ACCENT),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [BRAND_DARK]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(banner)
    story.append(Spacer(1, 14))

    # ---- Summary metric cards (800pt width) ----
    def metric_cell(label: str, value: str, color) -> Table:
        inner = Table(
            [[Paragraph(label, ParagraphStyle("lbl", parent=styles["Normal"],
                        fontSize=7, textColor=colors.HexColor("#64748b"),
                        fontName="Helvetica-Bold", alignment=TA_CENTER))],
             [Paragraph(value, ParagraphStyle("val", parent=styles["Normal"],
                        fontSize=17, textColor=color,
                        fontName="Helvetica-Bold", alignment=TA_CENTER))]],
            colWidths=[None],
        )
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 1, BORDER),
            ("ROUNDEDCORNERS", [6]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        return inner

    cards_data = [[
        metric_cell("TOTAL PREDICTIONS", str(total), BRAND_ACCENT),
        metric_cell("HIGH RISK", str(high_cnt), HIGH_RED),
        metric_cell("MEDIUM RISK", str(med_cnt), MED_AMBER),
        metric_cell("LOW RISK", str(low_cnt), LOW_GREEN),
        metric_cell("AVG RISK SCORE", f"{avg_risk:.1f}%", BRAND_ACCENT),
        metric_cell("AVG TRUST SCORE", f"{avg_trust:.1f}%", LOW_GREEN),
    ]]
    cards = Table(cards_data, colWidths=[800 / 6] * 6)
    cards.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(cards)
    story.append(Spacer(1, 14))

    # ---- Data table ----
    header_row = [Paragraph(h, header_cell_st) for h in _CSV_HEADERS]
    table_data = [header_row]

    for r in records:
        vals = _row_values(r)
        risk_level = str(vals[11]).lower()
        row = []
        for i, v in enumerate(vals):
            if i in (1, 2, 3, 7, 8):
                # Product Name, Category Name, Supplier Name, Shipping Mode, Order Region: left align
                row.append(Paragraph(str(v), cell_left_st))
            elif i == 11:
                # Risk level badge
                row.append(Paragraph(risk_level.upper(), rl_styles.get(risk_level, rl_styles["low"])))
            else:
                row.append(Paragraph(str(v), cell_st))
        table_data.append(row)

    # Column widths strictly matching printable width (~800pt total)
    col_widths = [85, 95, 75, 80, 35, 65, 60, 70, 75, 55, 55, 50]

    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    ts = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ROW_ALT]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("LINEAFTER", (0, 0), (0, -1), 1.2, ACCENT_LIGHT),
    ]
    table.setStyle(TableStyle(ts))
    story.append(table)

    # ---- Footer ----
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"OptiChain Procurement Guardian  ·  AI-Driven Supply Chain Disruption Predictor  ·  {generated_at}",
        ParagraphStyle("footer", parent=styles["Normal"],
                       fontSize=7, textColor=colors.HexColor("#94a3b8"),
                       fontName="Helvetica", alignment=TA_CENTER),
    ))

    doc.build(story)
    return buf.getvalue()


@router.get("/supply/export")
def supply_export(
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
    db: Session = Depends(get_db),
) -> Response:
    repo = SupplyRepository(db)
    records = repo.list_all()

    if format == "pdf":
        pdf_bytes = _build_pdf(records)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="supplier_risk_report.pdf"'
            },
        )

    # Default: CSV
    csv_content = _build_csv(records)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="supplier_risk_report.csv"'
        },
    )


# ---------------------------------------------------------------------------
# GET /supply/latest-risk
# ---------------------------------------------------------------------------

@router.get("/supply/latest-risk", response_model=LatestSupplyRiskResponse)
def supply_latest_risk(
    db: Session = Depends(get_db),
) -> LatestSupplyRiskResponse:
    repo = SupplyRepository(db)
    record = repo.get_latest()

    if record is not None:
        prob = float(record.disruption_probability)
        prob_percent = round((record.risk_score if record.risk_score is not None else prob * 100), 2)
        trust_percent = round((record.trust_score if record.trust_score is not None else 100.0 - prob_percent), 2)
        return LatestSupplyRiskResponse(
            supplier_id=record.supplier_id or record.supplier_name,
            vendor_id=record.vendor_id or record.product_name,
            disruption_probability=prob,
            disruption_probability_percent=prob_percent,
            supplier_trust_score=trust_percent,
            risk_level=record.risk_level,
            early_warning_alert=prob >= 0.5 or prob_percent >= 50.0,
            model_version=record.model_version,
            valid_upstream_risk_signal=True,
            created_at=record.created_at,
            product_name=record.product_name or record.vendor_id,
            category_name=record.category_name,
            supplier_name=record.supplier_name or record.supplier_id,
            month=record.month,
            year=record.year,
            expected_delay_days=record.expected_delay_days if record.expected_delay_days is not None else 0,
            risk_score=prob_percent,
            trust_score=trust_percent,
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
        product_name=None,
        category_name=None,
        supplier_name=None,
        month=None,
        year=None,
        expected_delay_days=0,
        risk_score=0.0,
        trust_score=100.0,
    )


# ---------------------------------------------------------------------------
# GET /supply/weather-risk
# ---------------------------------------------------------------------------

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
        condition = rng.choices(
            template["conditions"],
            weights=[20, 35, 45],
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

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SupplyPredictionRequest(BaseModel):
    days_for_shipping_real: int = Field(ge=0)
    days_for_shipment_scheduled: int = Field(ge=0)
    category_id: int = Field(ge=0)
    shipping_mode: str = Field(min_length=1)
    order_region: str = Field(min_length=1)


class SupplyPredictionResponse(BaseModel):
    status: str
    shipping_variance: int
    disruption_probability_percent: float = Field(ge=0, le=100)
    supplier_trust_score: float = Field(ge=0, le=100)
    early_warning_alert: bool
    risk_level: str


class SupplyRiskRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    supplier_id: str | None = Field(default=None, description="Observed supplier identifier when available")
    vendor_id: str | None = Field(default=None, description="Observed vendor identifier when available")
    raw_features: dict[str, float | int | str] = Field(default_factory=dict)
    model_version: str | None = None


class SupplyRiskSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    supplier_id: str | None = Field(default=None, description="Observed supplier identifier when available")
    vendor_id: str | None = Field(default=None, description="Observed vendor identifier when available")
    disruption_probability: float | None = Field(default=None, ge=0, le=1)
    risk_level: str | None = Field(default=None, description="Disruption severity level")
    risk_signal: str = Field(..., description="Derived or predicted risk signal")
    model_version: str | None = Field(default=None)
    is_predicted: bool = True


class SupplyRiskHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: int
    supplier_id: str | None = None
    vendor_id: str | None = None
    disruption_probability: float
    risk_level: str
    model_version: str
    created_at: datetime | str | None = None


class LatestSupplyRiskResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    supplier_id: str | None = Field(default=None, description="Observed supplier identifier")
    vendor_id: str | None = Field(default=None, description="Observed vendor identifier")
    disruption_probability: float = Field(..., ge=0, le=1, description="Disruption risk factor [0, 1]")
    disruption_probability_percent: float = Field(..., ge=0, le=100, description="Disruption probability percent")
    supplier_trust_score: float = Field(..., ge=0, le=100, description="Supplier trust score [0, 100]")
    risk_level: str = Field(..., description="Risk level: low, medium, high")
    early_warning_alert: bool = Field(..., description="Alert flag when disruption probability >= 50%")
    model_version: str = Field(default="xgboost-v1.0")
    valid_upstream_risk_signal: bool = Field(
        default=True,
        description="Flag indicating an active upstream risk signal for Inventory Guardian",
    )
    created_at: datetime | str | None = Field(default=None, description="Inference timestamp")


class PortWeatherRisk(BaseModel):
    """Telemetry snapshot for a single shipping port / trade lane."""

    port_name: str
    country: str
    weather_condition: str
    typhoon_monsoon_risk_score: int = Field(ge=0, le=100, description="Composite weather hazard score 0-100")
    port_congestion_level: str = Field(description="Low / Medium / High")
    estimated_delay_hours: int = Field(ge=0)
    status_badge: str = Field(description="Operational status label, e.g. DISRUPTED / WATCH / CLEAR")


class RouteWeatherRiskResponse(BaseModel):
    """Aggregated real-time shipping route weather risk payload."""

    generated_at: datetime
    overall_risk_level: str = Field(description="Worst-case level across all ports: LOW / MEDIUM / HIGH")
    ports: list[PortWeatherRisk]

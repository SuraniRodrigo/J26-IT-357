from __future__ import annotations

from datetime import datetime

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SupplyPredictionRequest(BaseModel):
    product_name: str = Field(default="Organic Cotton Denim Fabric", min_length=1)
    category_name: str = Field(default="Knitted Fabric", min_length=1)
    supplier_name: str = Field(default="TexLanka Mills", min_length=1)
    year: int = Field(default=2026, ge=2000, le=2100)
    month: int = Field(default=5, ge=1, le=12)
    scheduled_shipping_days: int = Field(default=4, ge=0)
    expected_delay_days: int = Field(default=0, ge=0)
    shipping_mode: str = Field(default="Standard Class", min_length=1)
    order_region: str = Field(default="Western Europe", min_length=1)

    # Legacy compatibility fields
    days_for_shipping_real: int | None = Field(default=None, ge=0)
    days_for_shipment_scheduled: int | None = Field(default=None, ge=0)
    category_id: int | None = Field(default=None, ge=0)

    @model_validator(mode="before")
    @classmethod
    def populate_defaults_and_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "scheduled_shipping_days" not in data and "days_for_shipment_scheduled" in data:
                data["scheduled_shipping_days"] = data["days_for_shipment_scheduled"]
            if "expected_delay_days" not in data:
                if "days_for_shipping_real" in data and "days_for_shipment_scheduled" in data:
                    real = data.get("days_for_shipping_real", 0) or 0
                    sched = data.get("days_for_shipment_scheduled", 0) or 0
                    data["expected_delay_days"] = max(0, real - sched)
        return data


class SupplyPredictionResponse(BaseModel):
    status: str = "success"
    product_name: str
    supplier_name: str
    category_name: str | None = None
    year: int | None = None
    month: int | None = None
    scheduled_shipping_days: int | None = None
    expected_delay_days: int | None = None
    actual_shipping_days: int | None = None
    shipping_variance: int
    risk_score: float = Field(ge=0, le=100)
    trust_score: float = Field(ge=0, le=100)
    risk_level: str
    disruption_probability_percent: float = Field(ge=0, le=100)
    supplier_trust_score: float = Field(ge=0, le=100)
    early_warning_alert: bool
    seasonal_risk_applied: bool = False
    delay_impact_description: str | None = None


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

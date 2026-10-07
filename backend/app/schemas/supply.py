from __future__ import annotations

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

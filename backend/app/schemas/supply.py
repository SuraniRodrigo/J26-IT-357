from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


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

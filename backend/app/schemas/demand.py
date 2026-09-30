from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DemandForecastRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    product_id: str = Field(..., description="Target product identifier")
    forecast_horizon_days: int = Field(default=30, ge=1, le=365)
    model_version: str | None = None


class DemandForecastSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    product_id: str = Field(..., description="Product identifier")
    forecast_date: date
    forecasted_demand: float | None = Field(default=None, ge=0)
    forecast_horizon: int = Field(..., ge=1)
    model_version: str | None = Field(default=None)

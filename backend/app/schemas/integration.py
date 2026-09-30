from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.demand import DemandForecastSchema
from app.schemas.inventory import InventoryPolicySchema
from app.schemas.production import ProductionScheduleSchema
from app.schemas.supply import SupplyRiskSchema


class OptiChainPipelineRequest(BaseModel):
    product_ids: list[str] = Field(default_factory=lambda: ["SKU-001"])
    forecast_horizon_days: int = Field(default=30, ge=1, le=365)
    lead_time_days: int = Field(default=7, ge=1)
    current_inventory: float = Field(default=0.0, ge=0)
    disruption_probability: float = Field(default=0.0, ge=0, le=1)


class OptiChainPipelineResponse(BaseModel):
    demand_forecast: list[DemandForecastSchema]
    supply_risk: list[SupplyRiskSchema]
    inventory_policy: list[InventoryPolicySchema]
    production_schedule: list[ProductionScheduleSchema]
    summary: dict[str, Any]

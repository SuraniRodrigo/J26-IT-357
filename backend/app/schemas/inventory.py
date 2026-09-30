from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class InventoryOptimizationRequest(BaseModel):
    product_id: str
    order_date: date
    current_inventory: float = Field(..., ge=0)
    forecasted_demand: float = Field(..., ge=0)
    demand_uncertainty: float = Field(default=0.0, ge=0)
    lead_time_days: int = Field(default=7, ge=1)
    lead_time_variability: float = Field(default=0.0, ge=0)
    disruption_probability: float = Field(default=0.0, ge=0, le=1)
    valid_upstream_risk_signal: bool = True


class InventoryPolicySchema(BaseModel):
    product_id: str
    order_date: date
    forecasted_demand: float | None = Field(default=None, ge=0)
    inventory_before_demand: float | None = Field(default=None, ge=0)
    inventory_position: float | None = Field(default=None, ge=0)
    selected_lead_time: int = Field(..., ge=1)
    selected_reorder_point: float | None = Field(default=None, ge=0)
    selected_reorder_quantity: float | None = Field(default=None, ge=0)
    safety_stock: float | None = Field(default=None, ge=0)
    material_requirement: float | None = Field(default=None, ge=0)
    material_shortage: float | None = Field(default=None, ge=0)
    material_availability_flag: bool | None = None
    reorder_recommendation: str


class InventoryAvailabilitySchema(BaseModel):
    product_id: str
    inventory_position: float | None = Field(default=None, ge=0)
    inventory_availability: float | None = Field(default=None, ge=0)
    material_requirement: float | None = Field(default=None, ge=0)
    material_shortage: float | None = Field(default=None, ge=0)
    material_availability_flag: bool | None = None


class MaterialRequirementSchema(BaseModel):
    product_id: str
    order_date: date
    material_requirement: float | None = Field(default=None, ge=0)
    material_shortage: float | None = Field(default=None, ge=0)
    material_availability_flag: bool | None = None
    selected_lead_time: int = Field(..., ge=1)
    reorder_recommendation: str

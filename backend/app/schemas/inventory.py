from __future__ import annotations

import math
import re
from datetime import date
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MAX_MATERIAL_QUANTITY = 10_000_000
MAX_LEAD_TIME_DAYS = 365


def validate_material_name(value: str) -> str:
    if len(value) < 2:
        raise ValueError("Material name must be at least 2 characters long.")
    if len(value) > 100:
        raise ValueError("Material name must be at most 100 characters.")
    if any(not (character.isalpha() or character == " ") for character in value):
        raise ValueError("Only letters and spaces are allowed in the material name.")
    return value


# ─── 1. OPTIMIZE REQUEST (Section 26) ───────────────────────────────────────
class InventoryOptimizationRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    product_id: str = Field(..., description="Unique product SKU or identifier")
    order_date: date | None = Field(default=None, description="Decision or order schedule date")
    current_inventory: float = Field(..., ge=0, le=MAX_MATERIAL_QUANTITY, description="On-hand warehouse stock")
    inventory_position: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY, description="On-hand + in-transit stock")
    in_transit_qty: float = Field(default=0.0, ge=0, le=MAX_MATERIAL_QUANTITY, description="Active purchase orders currently in transit")
    forecasted_demand: float = Field(..., ge=0, le=MAX_MATERIAL_QUANTITY, description="Forecasted demand from Module 1 / planning")
    forecast_horizon_days: int = Field(default=1, ge=1, le=365, description="Number of days covered by forecasted_demand")
    demand_std_dev: float = Field(default=38.87, ge=0, le=MAX_MATERIAL_QUANTITY, description="Standard deviation of daily/cycle demand")
    average_lead_time: float = Field(default=3.5, ge=0.1, le=MAX_LEAD_TIME_DAYS, description="Supplier baseline lead time in days")
    lead_time_std_dev: float = Field(default=1.62, ge=0, le=MAX_LEAD_TIME_DAYS, description="Variability of supplier lead time in days")
    expected_delay_days: float = Field(default=0.0, ge=0, le=MAX_LEAD_TIME_DAYS, description="Expected extra supplier delay from the supplier-risk report")
    disruption_probability: float = Field(default=0.0, ge=0, le=1, description="Disruption risk probability from Module 2 (0.0 - 1.0)")
    supplier_trust_score: float = Field(default=75.0, ge=1, le=100, description="Supplier trust rating (1 - 100)")
    service_level: float = Field(default=0.95, ge=0.5, le=0.9999, description="Target cycle service level")
    z_value: float = Field(default=1.645, ge=0.1, description="Normal distribution z-score for service level")
    replenishment_cycle_days: int = Field(default=7, ge=1, description="Replenishment review cycle in days")
    scenario: Literal["NORMAL", "MODERATE", "SEVERE"] = Field(default="NORMAL", description="Disruption stress scenario")
    policy_type: Literal["FORECAST_RISK_AWARE", "ADAPTIVE", "STATIC_BASELINE"] = Field(default="FORECAST_RISK_AWARE")
    custom_features: dict[str, float] | None = Field(default=None, description="Optional telemetry features for XGBoost model")

    @model_validator(mode="after")
    def validate_inventory_signal(self) -> "InventoryOptimizationRequest":
        if self.current_inventory == 0 and self.forecasted_demand == 0:
            raise ValueError("On-hand stock and forecast demand cannot both be zero for optimization.")
        return self


# ─── 2. OPTIMIZE RESPONSE (Section 27) ──────────────────────────────────────
class InventoryOptimizationResponse(BaseModel):
    product_id: str
    decision_date: date
    forecasted_demand: float
    forecast_horizon_days: int = 1
    current_inventory: float
    inventory_position: float
    in_transit_qty: float
    expected_delay_days: float = 0.0
    disruption_probability: float
    supplier_trust_score: float
    risk_level: str
    risk_factor: float

    # Core Policy Deliverables
    risk_adjusted_lead_time: float
    lead_time_demand: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float

    # Material Requirement & Availability (Section 17)
    material_requirement: float
    material_shortage: float
    material_availability_flag: bool

    # Backorder ML Signal (Section 19 & 40)
    backorder_risk: float
    went_on_backorder_pred: bool
    backorder_model_version: str

    # Decision Directive
    reorder_recommendation: str
    reorder_required: bool
    policy_type: str
    policy_version: str
    upstream_source: str


# Backward-compatible Schema for Legacy Callers
class InventoryPolicySchema(BaseModel):
    product_id: str
    order_date: date
    forecasted_demand: float | None = None
    inventory_before_demand: float | None = None
    inventory_position: float | None = None
    selected_lead_time: int
    selected_reorder_point: float | None = None
    selected_reorder_quantity: float | None = None
    safety_stock: float | None = None
    material_requirement: float | None = None
    material_shortage: float | None = None
    material_availability_flag: bool | None = None
    reorder_recommendation: str
    risk_level: str | None = "MEDIUM"
    backorder_risk: float | None = 0.0


# ─── 3. SCENARIO ANALYSIS (Section 36) ──────────────────────────────────────
class ScenarioAnalysisRequest(BaseModel):
    product_id: str
    current_inventory: float = Field(..., ge=0, le=MAX_MATERIAL_QUANTITY)
    forecasted_demand: float = Field(..., ge=0, le=MAX_MATERIAL_QUANTITY)
    forecast_horizon_days: int = Field(default=1, ge=1, le=365)
    in_transit_qty: float = Field(default=0.0, ge=0, le=MAX_MATERIAL_QUANTITY)
    expected_delay_days: float = Field(default=0.0, ge=0, le=MAX_LEAD_TIME_DAYS)
    base_disruption_prob: float = Field(default=0.35, ge=0, le=1)
    average_lead_time: float = Field(default=3.5, ge=0.1, le=MAX_LEAD_TIME_DAYS)
    lead_time_std_dev: float = Field(default=1.62, ge=0, le=MAX_LEAD_TIME_DAYS)
    demand_std_dev: float = Field(default=38.87, ge=0, le=MAX_MATERIAL_QUANTITY)
    supplier_trust_score: float = Field(default=75.0, ge=1, le=100)
    service_level: float = Field(default=0.95, ge=0.5, le=0.9999)
    replenishment_cycle_days: int = Field(default=7, ge=1)


class ScenarioEntrySchema(BaseModel):
    scenario: str
    multiplier: float
    disruption_probability: float
    risk_factor: float
    risk_adjusted_lead_time: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float
    material_shortage: float
    material_availability_flag: bool
    risk_level: str
    reorder_recommendation: str


class ScenarioAnalysisResponse(BaseModel):
    product_id: str
    forecasted_demand: float
    forecast_horizon_days: int = 1
    expected_delay_days: float = 0.0
    current_inventory: float
    scenarios: dict[str, ScenarioEntrySchema]


# ─── 4. PRODUCTION SCHEDULING INTEGRATION (Section 28 & 58) ─────────────────
class ProductionInterfaceItem(BaseModel):
    product_id: str
    product_name: str | None = None
    schedule_date: date
    material_requirement: float
    available_inventory: float
    material_shortage: float
    material_availability_flag: bool
    selected_lead_time: float
    selected_reorder_point: float
    selected_reorder_quantity: float
    inventory_risk_level: str
    reorder_recommendation: str
    is_demo_data: bool = True


# ─── 5. SUMMARY & HEALTH SCHEMAS ───────────────────────────────────────────
class InventorySummaryResponse(BaseModel):
    total_materials_monitored: int
    critical_shortages_count: int
    reorder_required_count: int
    average_service_level: float
    dead_stock_reduction_pct: float
    stockout_mitigation_pct: float
    upstream_data_mode: str
    policy_engine_version: str
    backorder_model_version: str
    system_status: str


class ProductCatalogItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    unit: str
    current_inventory: float
    in_transit_qty: float = 0.0
    forecasted_demand: float
    demand_std_dev: float
    average_lead_time: float
    lead_time_std_dev: float
    disruption_probability: float
    supplier_trust_score: float
    risk_level: str
    is_demo_data: bool = True
    is_demand_product: bool = False
    department: str | None = None
    export_markets: str | None = None
    unit_price_usd: float | None = None
    historical_orders: int | None = None
    total_historical_units: float | None = None
    projected_demand_30d: float | None = None
    fabric_requirement: float | None = None
    sewing_smv_minutes: float | None = None
    planning_status: str | None = None
    demand_forecast_horizon_days: int = 1
    supplier_name: str | None = None
    supplier_report_risk_level: str | None = None
    expected_delay_days: float = 0.0


class DemoDemandSupplierRiskRecord(BaseModel):
    product_id: str
    timestamp: str
    product_name: str
    category_name: str
    supplier_name: str
    year: int
    delivery_month: str
    expected_delay_days: float = Field(ge=0, le=MAX_LEAD_TIME_DAYS)
    shipping_mode: str
    order_region: str
    risk_score_pct: float = Field(ge=0, le=100)
    supplier_trust_score: float = Field(ge=0, le=100)
    risk_level: str


SKU_CATEGORY_PREFIXES = {
    "FAB": "Fabrics",
    "DYE": "Dyes & Chemicals",
    "CHM": "Dyes & Chemicals",
    "TRM": "Trims & Fasteners",
    "YRN": "Yarns & Threads",
}
CATEGORY_SKU_PREFIXES = {
    "Fabrics": "FAB",
    "Dyes & Chemicals": "DYE",
    "Trims & Fasteners": "TRM",
    "Yarns & Threads": "YRN",
}
MaterialCategory = str


class CreateProductCatalogItem(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    product_id: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Z][A-Z0-9]{1,9}-[A-Z0-9][A-Z0-9._-]{0,39}$")
    product_name: str = Field(..., min_length=2, max_length=200)
    category: MaterialCategory = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=20)
    current_inventory: float = Field(..., ge=0, le=MAX_MATERIAL_QUANTITY)
    in_transit_qty: float = Field(default=0, ge=0, le=MAX_MATERIAL_QUANTITY)
    forecasted_demand: float = Field(..., ge=0, le=MAX_MATERIAL_QUANTITY)
    demand_std_dev: float = Field(default=0.0, ge=0, le=MAX_MATERIAL_QUANTITY)
    average_lead_time: float = Field(..., ge=0.1, le=MAX_LEAD_TIME_DAYS)
    lead_time_std_dev: float = Field(default=1.0, ge=0, le=MAX_LEAD_TIME_DAYS)
    disruption_probability: float = Field(..., ge=0, le=1)
    supplier_trust_score: float = Field(default=80.0, ge=1, le=100)
    risk_level: str | None = None
    is_demo_data: bool = False
    is_demand_product: bool = False
    department: str | None = Field(default=None, max_length=100)
    export_markets: str | None = Field(default=None, max_length=500)
    unit_price_usd: float | None = Field(default=None, ge=0)
    historical_orders: int | None = Field(default=None, ge=0)
    total_historical_units: float | None = Field(default=None, ge=0)
    projected_demand_30d: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    fabric_requirement: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    sewing_smv_minutes: float | None = Field(default=None, ge=0, le=1440)
    planning_status: str | None = Field(default=None, max_length=100)
    demand_forecast_horizon_days: int = Field(default=1, ge=1, le=365)
    supplier_name: str | None = Field(default=None, max_length=200)
    supplier_report_risk_level: str | None = Field(default=None, max_length=20)
    expected_delay_days: float = Field(default=0.0, ge=0, le=MAX_LEAD_TIME_DAYS)

    @field_validator("product_id", mode="before")
    @classmethod
    def normalize_product_id(cls, value: Any) -> Any:
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("product_name", "unit", mode="before")
    @classmethod
    def normalize_required_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_catalog_item(self) -> "CreateProductCatalogItem":
        if self.current_inventory == 0 and self.forecasted_demand == 0 and (self.projected_demand_30d or 0) == 0:
            raise ValueError("On-hand stock and forecast demand cannot both be zero; provide meaningful inventory or demand data.")

        prefix = self.product_id.split("-", 1)[0]
        if self.is_demand_product:
            if not re.fullmatch(r"LK-[A-Z]{2,6}-[0-9]{3,}", self.product_id):
                raise ValueError("Demand product SKU must match the Demand module format, for example LK-APP-001.")
            if self.projected_demand_30d is None or self.demand_forecast_horizon_days != 30:
                raise ValueError("Demand products require the Demand module's 30-day projected demand.")
            if self.product_name.strip() == "":
                raise ValueError("Product name is required.")
            if any(value is None for value in (
                self.department,
                self.export_markets,
                self.unit_price_usd,
                self.historical_orders,
                self.total_historical_units,
                self.fabric_requirement,
                self.sewing_smv_minutes,
                self.planning_status,
            )):
                raise ValueError("Complete all Demand module product fields before saving.")
            if not math.isclose(
                self.forecasted_demand,
                self.projected_demand_30d / 30,
                rel_tol=1e-6,
                abs_tol=1e-6,
            ):
                raise ValueError("Daily forecast must equal the 30-day projected demand divided by 30.")
        else:
            expected_prefix = CATEGORY_SKU_PREFIXES.get(self.category)
            if expected_prefix is None:
                raise ValueError(f"Unsupported material category '{self.category}'.")
            if prefix != expected_prefix:
                raise ValueError(
                    f"SKU ID for category '{self.category}' must start with '{expected_prefix}-'."
                )
            validate_material_name(self.product_name)
        return self


class UpdateProductCatalogItem(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    product_name: str | None = Field(default=None, min_length=2, max_length=200)
    category: MaterialCategory | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    current_inventory: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    in_transit_qty: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    forecasted_demand: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    demand_std_dev: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    average_lead_time: float | None = Field(default=None, ge=0.1, le=MAX_LEAD_TIME_DAYS)
    lead_time_std_dev: float | None = Field(default=None, ge=0, le=MAX_LEAD_TIME_DAYS)
    disruption_probability: float | None = Field(default=None, ge=0, le=1)
    supplier_trust_score: float | None = Field(default=None, ge=1, le=100)
    is_demand_product: bool | None = None
    department: str | None = Field(default=None, max_length=100)
    export_markets: str | None = Field(default=None, max_length=500)
    unit_price_usd: float | None = Field(default=None, ge=0)
    historical_orders: int | None = Field(default=None, ge=0)
    total_historical_units: float | None = Field(default=None, ge=0)
    projected_demand_30d: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    fabric_requirement: float | None = Field(default=None, ge=0, le=MAX_MATERIAL_QUANTITY)
    sewing_smv_minutes: float | None = Field(default=None, ge=0, le=1440)
    planning_status: str | None = Field(default=None, max_length=100)
    demand_forecast_horizon_days: int | None = Field(default=None, ge=1, le=365)
    supplier_name: str | None = Field(default=None, max_length=200)
    supplier_report_risk_level: str | None = Field(default=None, max_length=20)
    expected_delay_days: float | None = Field(default=None, ge=0, le=MAX_LEAD_TIME_DAYS)

    @field_validator("product_name", "unit", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_product_name_for_type(self) -> "UpdateProductCatalogItem":
        if self.product_name is not None and self.is_demand_product is not True:
            validate_material_name(self.product_name)
        return self


# ─── 6. RESEARCH RESULTS SCHEMA (Section 8 & 41) ────────────────────────────
class PolicyComparisonMetric(BaseModel):
    policy_name: str
    total_demand: float
    fulfilled_demand: float
    stockout_units: float
    service_level_pct: float
    stockout_rate_pct: float
    average_inventory: float
    replenishment_orders: int


class ResearchResultsResponse(BaseModel):
    dataset_name: str
    development_period: str
    total_records_analyzed: int
    baseline_policy: PolicyComparisonMetric
    adaptive_policy: PolicyComparisonMetric
    forecast_risk_aware_policy: PolicyComparisonMetric
    observed_improvements: dict[str, Any]
    backorder_xgboost_metrics: dict[str, Any]
    research_source_files: list[str]


# ─── 7. BATCH OPTIMIZATION SCHEMA ──────────────────────────────────────────
class BatchOptimizationRequest(BaseModel):
    disruption_probability_override: float | None = Field(default=None, ge=0, le=1, description="Override disruption probability for all products")
    lead_time_std_dev_override: float | None = Field(default=None, ge=0, description="Override lead time std dev")
    demand_surge_pct: float = Field(default=0.0, ge=-50, le=200, description="Demand surge percentage adjustment")
    service_level: float = Field(default=0.95, ge=0.5, le=0.9999, description="Target service level")
    scenario: Literal["NORMAL", "MODERATE", "SEVERE"] = Field(default="NORMAL")
    policy_type: Literal["FORECAST_RISK_AWARE", "ADAPTIVE", "STATIC_BASELINE"] = Field(default="FORECAST_RISK_AWARE")

from __future__ import annotations

from datetime import date
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ─── 1. OPTIMIZE REQUEST (Section 26) ───────────────────────────────────────
class InventoryOptimizationRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    product_id: str = Field(..., description="Unique product SKU or identifier")
    order_date: date | None = Field(default=None, description="Decision or order schedule date")
    current_inventory: float = Field(..., ge=0, description="On-hand warehouse stock")
    inventory_position: float | None = Field(default=None, ge=0, description="On-hand + in-transit stock")
    in_transit_qty: float = Field(default=0.0, ge=0, description="Active purchase orders currently in transit")
    forecasted_demand: float = Field(..., ge=0, description="Forecasted demand from Module 1 / planning")
    demand_std_dev: float = Field(default=38.87, ge=0, description="Standard deviation of daily/cycle demand")
    average_lead_time: float = Field(default=3.5, ge=0.1, description="Supplier baseline lead time in days")
    lead_time_std_dev: float = Field(default=1.62, ge=0, description="Variability of supplier lead time in days")
    disruption_probability: float = Field(default=0.0, ge=0, le=1, description="Disruption risk probability from Module 2 (0.0 - 1.0)")
    supplier_trust_score: float = Field(default=75.0, ge=0, le=100, description="Supplier trust rating (0 - 100)")
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
    current_inventory: float
    inventory_position: float
    in_transit_qty: float
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
    current_inventory: float = Field(..., ge=0)
    forecasted_demand: float = Field(..., ge=0)
    base_disruption_prob: float = Field(default=0.35, ge=0, le=1)
    average_lead_time: float = Field(default=3.5, ge=0.1)
    lead_time_std_dev: float = Field(default=1.62, ge=0)
    demand_std_dev: float = Field(default=38.87, ge=0)
    supplier_trust_score: float = Field(default=75.0, ge=0, le=100)
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
    forecasted_demand: float
    demand_std_dev: float
    average_lead_time: float
    lead_time_std_dev: float
    disruption_probability: float
    supplier_trust_score: float
    risk_level: str
    is_demo_data: bool = True


SKU_CATEGORY_PREFIXES = {
    "FAB": "Fabrics",
    "DYE": "Dyes & Chemicals",
    "CHM": "Dyes & Chemicals",
    "TRM": "Trims & Fasteners",
    "YRN": "Yarns & Threads",
}
MaterialCategory = Literal["Fabrics", "Dyes & Chemicals", "Trims & Fasteners", "Yarns & Threads"]


class CreateProductCatalogItem(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    product_id: str = Field(..., min_length=3, max_length=50, pattern=r"^[A-Z][A-Z0-9]{1,9}-[A-Z0-9][A-Z0-9._-]{0,39}$")
    product_name: str = Field(..., min_length=1, max_length=200)
    category: MaterialCategory
    unit: str = Field(..., min_length=1, max_length=20)
    current_inventory: float = Field(..., ge=0)
    forecasted_demand: float = Field(..., ge=0)
    demand_std_dev: float = Field(default=0.0, ge=0)
    average_lead_time: float = Field(..., ge=0.1)
    lead_time_std_dev: float = Field(default=1.0, ge=0)
    disruption_probability: float = Field(..., ge=0, le=1)
    supplier_trust_score: float = Field(default=80.0, ge=0, le=100)
    risk_level: str | None = None
    is_demo_data: bool = False

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
        if self.current_inventory == 0 and self.forecasted_demand == 0:
            raise ValueError("On-hand stock and forecast demand cannot both be zero; provide meaningful inventory or demand data.")

        prefix = self.product_id.split("-", 1)[0]
        expected_category = SKU_CATEGORY_PREFIXES.get(prefix)
        if expected_category and self.category != expected_category:
            raise ValueError(
                f"SKU prefix '{prefix}' belongs to the '{expected_category}' category, not '{self.category}'."
            )
        return self


class UpdateProductCatalogItem(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    product_name: str | None = Field(default=None, min_length=1, max_length=200)
    category: MaterialCategory | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=20)
    current_inventory: float | None = Field(default=None, ge=0)
    forecasted_demand: float | None = Field(default=None, ge=0)
    demand_std_dev: float | None = Field(default=None, ge=0)
    average_lead_time: float | None = Field(default=None, ge=0.1)
    lead_time_std_dev: float | None = Field(default=None, ge=0)
    disruption_probability: float | None = Field(default=None, ge=0, le=1)
    supplier_trust_score: float | None = Field(default=None, ge=0, le=100)

    @field_validator("product_name", "unit", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


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

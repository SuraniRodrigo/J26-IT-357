from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DemandForecastRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    product_id: str = Field(..., description="Target product identifier, silhouette, or hierarchical node")
    forecast_horizon_days: int = Field(default=30, ge=1, le=365)
    model_version: str | None = None
    data_source: str | None = Field(default="auto", description="Source to use: 'auto', 'm5', or 'dataco'")


class DemandForecastSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    product_id: str = Field(..., description="Product identifier")
    forecast_date: date
    forecasted_demand: float | None = Field(default=None, ge=0)
    forecast_horizon: int = Field(..., ge=1)
    model_version: str | None = Field(default=None)
    lower_bound: float | None = Field(default=None, description="P10 lower prediction interval")
    upper_bound: float | None = Field(default=None, description="P90 upper prediction interval")
    data_source: str | None = Field(default=None, description="Dataset/method source of forecast")


class DemandReconcileRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    forecast_horizon_days: int = Field(default=30, ge=1, le=365)
    reconciliation_method: str = Field(default="MinT", description="MinT, BU, TD, MO, or OLS")
    buyer_surge_factor: float = Field(default=0.0, ge=-50.0, le=100.0)
    selected_facility: str | None = "ALL_FACILITIES"
    selected_buyer: str | None = "ALL"


class DemandReconcileNodeResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    node_id: str
    total_forecast: float
    daily_forecasts: list[float]


class DemandReconcileResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    reconciliation_method: str
    forecast_horizon_days: int
    is_coherent: bool
    max_discrepancy: float
    root_total_forecast: float
    sum_bottom_forecast: float
    nodes: list[DemandReconcileNodeResult]
    data_source: str = "m5_hierarchical_mint"


class RealProductSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    product_name: str
    category_name: str
    department_name: str
    total_orders: int
    total_quantity: int
    total_sales: float
    avg_price: float
    markets: list[str] = []
    source: str = "dataco"


class RealCategorySchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    category_name: str
    department_name: str | None = None
    product_count: int
    total_quantity: int
    total_sales: float
    source: str = "dataco"


class RealDepartmentSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    department_name: str
    category_count: int
    product_count: int
    total_quantity: int
    total_sales: float
    source: str = "dataco"


class RealHistoricalPointSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    date: str
    quantity: float
    sales: float | None = None
    orders_count: int | None = None


class RealHistoricalResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    identifier: str
    source: str
    total_quantity: float
    data_points: list[RealHistoricalPointSchema]


class DatasetSummarySchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    dataco: dict[str, Any]
    m5: dict[str, Any]
    active_sources: list[str]


class FashionTrendItemSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    silhouette_name: str
    product_name: str
    specs: str
    badge: str
    orders: int
    sales_display: str
    sales_amount: float
    velocity: int
    image_url: str | None = None


class SeasonalDemandItemSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    season_name: str
    code: str
    multiplier: str
    period_desc: str
    line_capacity_locked: int
    transit: str
    port_status: str
    buffer_desc: str | None = None
    line_status: str | None = None
    orders: int
    sales_display: str


class ColorPreferenceItemSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str
    hex: str
    border_color: str
    share_pct: int
    pieces: int
    chemical_recipe: str
    dye_lot_kg: int
    wash_fastness: str
    target_application: str


class BuyerBehaviourItemSchema(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    buyer_name: str
    tier: str
    repeat_rate: str
    cadence: str
    avg_po_size: str
    extra_metric_label: str
    extra_metric_value: str
    details: str
    segment_ref: str


class DemandDriversResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    fashion_trends: list[FashionTrendItemSchema]
    seasonal_demands: list[SeasonalDemandItemSchema]
    color_preferences: list[ColorPreferenceItemSchema]
    buyer_behaviour: list[BuyerBehaviourItemSchema]
    meta: dict[str, Any]


class FactorAnalysisInput(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    fashion_trend_growth_pct: float = Field(default=25.0, description="Projected fashion trend growth percentage (e.g. +25%)")
    seasonal_multiplier: float = Field(default=1.20, description="Seasonal surge multiplier (e.g. 1.20 for peak, 0.85 for off-season)")
    color_preference_score: float = Field(default=85.0, description="Color palette affinity score (0-100)")
    buyer_behaviour_weight: float = Field(default=1.15, description="Buyer order volume factor (e.g. 1.15 for corporate bulk)")
    promotion_lift_pct: float = Field(default=10.0, description="Promotional campaign demand lift percentage")


class PeriodDemandForecastRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    target_period: str = Field(..., description="Target month or period name, e.g., 'November 2026', 'December 2026'")
    horizon_days: int = Field(default=30, ge=7, le=365, description="Forecast horizon in days")
    product_identifier: str = Field(default="Seamless Athleisure & Active Bralettes", description="Product, silhouette, or category identifier")
    base_monthly_demand: float | None = Field(default=None, description="Optional baseline monthly demand override")
    factors: FactorAnalysisInput = Field(default_factory=FactorAnalysisInput)
    lead_time_days: int = Field(default=14, ge=1, le=120)
    current_inventory: float = Field(default=3500.0, ge=0)


class FactorImpactItem(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    factor_name: str
    impact_pct: float
    description: str
    status: str


class PeriodDemandForecastResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    target_period: str
    product_identifier: str
    horizon_days: int
    baseline_demand: float
    forecasted_demand: float
    daily_run_rate: float
    demand_uncertainty: float
    confidence_interval_lower: float
    confidence_interval_upper: float
    factor_multiplier_composite: float
    factor_breakdown: list[FactorImpactItem]
    inventory_handoff_payload: dict[str, Any]
    material_requirements: dict[str, Any]



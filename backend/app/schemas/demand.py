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

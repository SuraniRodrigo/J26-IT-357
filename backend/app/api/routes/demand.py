from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Query

from app.schemas.demand import (
    DatasetSummarySchema,
    DemandDriversResponse,
    DemandForecastRequest,
    DemandForecastSchema,
    DemandReconcileRequest,
    DemandReconcileResponse,
    PeriodDemandForecastRequest,
    PeriodDemandForecastResponse,
    RealCategorySchema,
    RealDepartmentSchema,
    RealHistoricalResponse,
    RealProductSchema,
)
from app.services.demand_service import (
    forecast_demand_by_period,
    generate_forecast,
    get_datasets_summary,
    get_demand_drivers,
    get_hierarchy_metadata,
    get_real_categories,
    get_real_departments,
    get_real_historical,
    get_real_products,
    reconcile_hierarchy,
)

router = APIRouter(tags=["demand"])


@router.post("/demand/forecast", response_model=list[DemandForecastSchema])
def demand_forecast(request: DemandForecastRequest) -> list[DemandForecastSchema]:
    """
    Generate demand forecast using either the trained hierarchical MinT reconciliation model
    or real CSV empirical time-series forecasting.
    """
    try:
        return generate_forecast(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/demand/forecast-period", response_model=PeriodDemandForecastResponse)
def demand_forecast_period(request: PeriodDemandForecastRequest) -> PeriodDemandForecastResponse:
    """
    Analyze multi-driver demand factors for a given planning period/month,
    compute projected demand with confidence intervals, and construct the inventory handoff contract.
    """
    try:
        return forecast_demand_by_period(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/demand/reconcile", response_model=DemandReconcileResponse)
def demand_reconcile(request: DemandReconcileRequest) -> DemandReconcileResponse:
    """
    Execute full multi-node hierarchical reconciliation across the forecasting tree.
    """
    try:
        return reconcile_hierarchy(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/demand/hierarchy", response_model=dict[str, Any])
def demand_hierarchy() -> dict[str, Any]:
    """
    Returns hierarchical structure, node counts, reconciliation metadata, and dataset status.
    """
    return get_hierarchy_metadata()


@router.get("/demand/products", response_model=list[RealProductSchema])
def list_real_products(
    category: str | None = Query(default=None, description="Filter by category name"),
    department: str | None = Query(default=None, description="Filter by department name"),
    search: str | None = Query(default=None, description="Search term for product or category"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[RealProductSchema]:
    """
    Returns real products from the DataCo Supply Chain CSV dataset.
    """
    return get_real_products(
        category=category,
        department=department,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/demand/categories", response_model=list[RealCategorySchema])
def list_real_categories(
    source: str = Query(default="dataco", description="Data source: 'dataco' or 'm5'")
) -> list[RealCategorySchema]:
    """
    Returns real categories and aggregated volumes from the CSV datasets.
    """
    return get_real_categories(source=source)


@router.get("/demand/departments", response_model=list[RealDepartmentSchema])
def list_real_departments(
    source: str = Query(default="dataco", description="Data source: 'dataco' or 'm5'")
) -> list[RealDepartmentSchema]:
    """
    Returns real departments and metrics from the CSV datasets.
    """
    return get_real_departments(source=source)


@router.get("/demand/historical", response_model=RealHistoricalResponse)
def get_historical_observations(
    identifier: str = Query(..., description="Product name, category, or M5 node identifier"),
    source: str = Query(default="auto", description="Source: 'auto', 'dataco', or 'm5'"),
    days: int = Query(default=90, ge=7, le=365, description="Number of historical days to retrieve"),
) -> RealHistoricalResponse:
    """
    Retrieve authentic time-series sales/order observations from DataCo or M5 CSV files.
    """
    return get_real_historical(identifier=identifier, source=source, days=days)


@router.get("/demand/dataset-summary", response_model=DatasetSummarySchema)
def dataset_summary() -> DatasetSummarySchema:
    """
    Returns operational summary of both real CSV datasets (record counts, volumes, dates).
    """
    return get_datasets_summary()


@router.get("/demand/drivers", response_model=DemandDriversResponse)
def demand_drivers() -> DemandDriversResponse:
    """
    Decomposed parameters directly feeding the hierarchical MinT reconciliation matrix:
    Fashion Trends, Seasonal Demands, Color Palettes, and Buyer Purchasing Behaviour.
    """
    return get_demand_drivers()



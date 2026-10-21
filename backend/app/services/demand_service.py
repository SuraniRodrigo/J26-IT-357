from __future__ import annotations

from typing import Any

from app.ml.demand.hierarchical_mint import ReconciliationMethod
from app.ml.demand.model import DemandModelService
from app.repositories.demand_repository import DemandRepository
from app.schemas.demand import (
    DatasetSummarySchema,
    DemandDriversResponse,
    DemandForecastRequest,
    DemandForecastSchema,
    DemandReconcileNodeResult,
    DemandReconcileRequest,
    DemandReconcileResponse,
    RealCategorySchema,
    RealDepartmentSchema,
    RealHistoricalPointSchema,
    RealHistoricalResponse,
    RealProductSchema,
)


def generate_forecast(request: DemandForecastRequest) -> list[DemandForecastSchema]:
    """
    Generate demand forecast using either the trained M5 Hierarchical MinT engine
    or empirical statistical engine backed directly by real CSV datasets.
    """
    if request.forecast_horizon_days < 1:
        raise ValueError("Forecast horizon must be positive.")

    service = DemandModelService.get_instance()
    return service.forecast(
        product_id=request.product_id,
        horizon_days=request.forecast_horizon_days,
        model_version=request.model_version,
        data_source=request.data_source,
    )


def reconcile_hierarchy(request: DemandReconcileRequest) -> DemandReconcileResponse:
    """
    Execute multi-level hierarchical reconciliation across the entire tree
    using MinT, BU, TD, MO, or OLS.
    """
    if request.forecast_horizon_days < 1:
        raise ValueError("Forecast horizon must be positive.")

    service = DemandModelService.get_instance()
    method_val: ReconciliationMethod = request.reconciliation_method  # type: ignore[assignment]
    if method_val not in ["MinT", "BU", "TD", "MO", "OLS"]:
        method_val = "MinT"

    res = service.reconcile_hierarchy_all(
        horizon_days=request.forecast_horizon_days,
        method=method_val,
        buyer_surge_factor=request.buyer_surge_factor,
    )

    if res.get("status") == "unloaded":
        raise ValueError("Hierarchical model artifact is not loaded.")

    node_objects = [
        DemandReconcileNodeResult(
            node_id=n["node_id"],
            total_forecast=n["total_forecast"],
            daily_forecasts=n["daily_forecasts"],
        )
        for n in res.get("nodes", [])
    ]

    return DemandReconcileResponse(
        reconciliation_method=res["reconciliation_method"],
        forecast_horizon_days=res["forecast_horizon_days"],
        is_coherent=res["is_coherent"],
        max_discrepancy=res["max_discrepancy"],
        root_total_forecast=res["root_total_forecast"],
        sum_bottom_forecast=res["sum_bottom_forecast"],
        nodes=node_objects,
        data_source=res.get("data_source", "m5_hierarchical_mint"),
    )


def get_hierarchy_metadata() -> dict[str, Any]:
    """
    Return metadata for the hierarchical forecasting tree and real CSV datasets.
    """
    service = DemandModelService.get_instance()
    return service.get_hierarchy_metadata()


def get_real_products(
    category: str | None = None,
    department: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[RealProductSchema]:
    """
    Query real products directly from the DataCo Supply Chain CSV dataset.
    """
    repo = DemandRepository.get_instance()
    raw_products = repo.get_dataco_products(
        category=category,
        department=department,
        search=search,
        limit=limit,
        offset=offset,
    )
    return [RealProductSchema(**p) for p in raw_products]


def get_real_categories(source: str = "dataco") -> list[RealCategorySchema]:
    """
    Query real categories and their aggregated volume from the CSV datasets.
    """
    repo = DemandRepository.get_instance()
    if source.lower() == "m5":
        m5_info = repo.get_m5_hierarchy_info()
        return [
            RealCategorySchema(
                category_name=cat,
                department_name=None,
                product_count=0,
                total_quantity=0,
                total_sales=0.0,
                source="m5",
            )
            for cat in m5_info.get("categories", [])
        ]

    raw_cats = repo.get_dataco_categories()
    return [RealCategorySchema(**c) for c in raw_cats]


def get_real_departments(source: str = "dataco") -> list[RealDepartmentSchema]:
    """
    Query real departments and aggregated metrics from the CSV datasets.
    """
    repo = DemandRepository.get_instance()
    if source.lower() == "m5":
        m5_info = repo.get_m5_hierarchy_info()
        return [
            RealDepartmentSchema(
                department_name=dept,
                category_count=0,
                product_count=0,
                total_quantity=0,
                total_sales=0.0,
                source="m5",
            )
            for dept in m5_info.get("departments", [])
        ]

    raw_depts = repo.get_dataco_departments()
    return [RealDepartmentSchema(**d) for d in raw_depts]


def get_real_historical(
    identifier: str,
    source: str = "auto",
    days: int = 90,
) -> RealHistoricalResponse:
    """
    Retrieve authentic time-series sales/order observations from DataCo or M5 CSV.
    """
    repo = DemandRepository.get_instance()
    target_source = source.lower()

    points = []
    resolved_source = "dataco"

    if target_source in ["auto", "dataco"]:
        points = repo.get_dataco_time_series(product_name=identifier, days=days)
        if not points:
            points = repo.get_dataco_time_series(category=identifier, days=days)
        if not points:
            points = repo.get_dataco_time_series(department=identifier, days=days)
        if points:
            resolved_source = "dataco"

    if not points and target_source in ["auto", "m5"]:
        points = repo.get_m5_time_series(node_id=identifier, days=days)
        if points:
            resolved_source = "m5"

    total_qty = sum(p["quantity"] for p in points if p.get("quantity") is not None)

    return RealHistoricalResponse(
        identifier=identifier,
        source=resolved_source,
        total_quantity=float(round(total_qty, 1)),
        data_points=[RealHistoricalPointSchema(**p) for p in points],
    )


def get_datasets_summary() -> DatasetSummarySchema:
    """
    Return dataset telemetry summarizing records in both DataCo and M5 datasets.
    """
    repo = DemandRepository.get_instance()
    data = repo.get_datasets_summary()
    return DatasetSummarySchema(**data)


def get_demand_drivers() -> DemandDriversResponse:
    """
    Decompose multi-driver demand parameters feeding the MinT hierarchy:
    Fashion Trends, Seasonal Demands, Color Palettes, Buyer Purchasing Behaviour.
    """
    repo = DemandRepository.get_instance()
    data = repo.get_demand_drivers()
    return DemandDriversResponse(**data)


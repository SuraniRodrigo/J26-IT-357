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
    FactorImpactItem,
    PeriodDemandForecastRequest,
    PeriodDemandForecastResponse,
    RealCategorySchema,
    RealDepartmentSchema,
    RealHistoricalPointSchema,
    RealHistoricalResponse,
    RealProductSchema,
)
import math
from datetime import date



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


def forecast_demand_by_period(request: PeriodDemandForecastRequest) -> PeriodDemandForecastResponse:
    """
    Analyze multi-driver apparel demand factors for a given planning period/month,
    compute forecasted demand with uncertainty bounds, and construct the inventory handoff contract.
    """
    if request.horizon_days < 1:
        raise ValueError("Forecast horizon must be at least 1 day.")
    if request.current_inventory < 0:
        raise ValueError("Current inventory cannot be negative.")

    # 1. Determine baseline monthly demand
    if request.base_monthly_demand is not None and request.base_monthly_demand > 0:
        baseline_demand = float(request.base_monthly_demand)
    else:
        repo = DemandRepository.get_instance()
        points = repo.get_dataco_time_series(product_name=request.product_identifier, days=90)
        if points:
            tot = sum(p["quantity"] for p in points if p.get("quantity") is not None)
            baseline_demand = round((tot / len(points)) * 30.0, 1)
        else:
            name_lower = request.product_identifier.lower()
            if "bralette" in name_lower or "seamless" in name_lower:
                baseline_demand = 16800.0
            elif "legging" in name_lower or "align" in name_lower:
                baseline_demand = 14500.0
            elif "cleat" in name_lower or "shoe" in name_lower:
                baseline_demand = 11200.0
            else:
                baseline_demand = 15000.0

    # 2. Analyze factor multipliers
    factors = request.factors
    trend_mult = 1.0 + (factors.fashion_trend_growth_pct / 100.0)
    season_mult = factors.seasonal_multiplier
    color_mult = 0.90 + (factors.color_preference_score / 500.0)
    buyer_mult = factors.buyer_behaviour_weight
    promo_mult = 1.0 + (factors.promotion_lift_pct / 100.0)

    composite_mult = round(trend_mult * season_mult * color_mult * buyer_mult * promo_mult, 4)

    # 3. Forecast calculations for target period horizon
    horizon_ratio = request.horizon_days / 30.0
    forecasted_demand = round(baseline_demand * composite_mult * horizon_ratio, 1)
    daily_run_rate = round(forecasted_demand / request.horizon_days, 1)
    demand_uncertainty = round(forecasted_demand * 0.12, 1)

    ci_lower = round(max(0.0, forecasted_demand - 1.96 * (demand_uncertainty / math.sqrt(request.horizon_days))), 1)
    ci_upper = round(forecasted_demand + 1.96 * (demand_uncertainty / math.sqrt(request.horizon_days)), 1)

    # 4. Detailed factor impact breakdown
    breakdown = [
        FactorImpactItem(
            factor_name="Fashion Trend Velocity",
            impact_pct=round(factors.fashion_trend_growth_pct, 1),
            description=f"Apparel silhouette adoption velocity (+{factors.fashion_trend_growth_pct:.1f}%)",
            status="ACCELERATING" if factors.fashion_trend_growth_pct > 15 else "STEADY",
        ),
        FactorImpactItem(
            factor_name="Seasonal Demand Multiplier",
            impact_pct=round((season_mult - 1.0) * 100.0, 1),
            description=f"Cyclical calendar lift ({season_mult:.2f}x) for {request.target_period}",
            status="PEAK SURGE" if season_mult >= 1.25 else ("MODERATE" if season_mult >= 1.0 else "OFF-SEASON"),
        ),
        FactorImpactItem(
            factor_name="Color Palette Affinity",
            impact_pct=round((color_mult - 1.0) * 100.0, 1),
            description=f"Trending chemical dye & colorway preference ({factors.color_preference_score:.0f}/100)",
            status="HIGH AFFINITY" if factors.color_preference_score >= 80 else "NEUTRAL",
        ),
        FactorImpactItem(
            factor_name="Buyer Order Channel",
            impact_pct=round((buyer_mult - 1.0) * 100.0, 1),
            description=f"Wholesale bulk purchasing and replenishment cadence ({buyer_mult:.2f}x)",
            status="BULK EXPANSION" if buyer_mult >= 1.15 else "STANDARD",
        ),
        FactorImpactItem(
            factor_name="Promotional Campaign Lift",
            impact_pct=round(factors.promotion_lift_pct, 1),
            description=f"Omnichannel seasonal campaign lift (+{factors.promotion_lift_pct:.1f}%)",
            status="CAMPAIGN ACTIVE" if factors.promotion_lift_pct > 0 else "BASELINE",
        ),
    ]

    # 5. Inventory Handoff Payload (contract for InventoryOptimizationRequest)
    inventory_payload = {
        "product_id": request.product_identifier,
        "order_date": date.today().isoformat(),
        "current_inventory": float(request.current_inventory),
        "forecasted_demand": float(forecasted_demand),
        "demand_uncertainty": float(demand_uncertainty),
        "lead_time_days": int(request.lead_time_days),
        "lead_time_variability": 2.5,
        "disruption_probability": 0.12,
        "valid_upstream_risk_signal": True,
        "target_period": request.target_period,
    }

    # 6. Inventory Optimization & Material Planning Equations
    daily_sigma = demand_uncertainty / math.sqrt(request.horizon_days)
    lead_time_demand = daily_run_rate * request.lead_time_days
    safety_stock = round(1.65 * math.sqrt(request.lead_time_days * (daily_sigma ** 2) + (daily_run_rate ** 2) * (2.5 ** 2)), 1)
    reorder_point = round(lead_time_demand + safety_stock, 1)
    eoq = round(math.sqrt((2 * forecasted_demand * 75.0) / 3.5), 1)

    fabric_bom_meters = round(forecasted_demand * 1.85, 1)
    smv_man_hours = round((forecasted_demand * 14.2) / 60.0, 1)
    sewing_lines_needed = math.ceil(smv_man_hours / (request.horizon_days * 54.0))

    material_reqs = {
        "safety_stock_units": safety_stock,
        "reorder_point_units": reorder_point,
        "recommended_reorder_qty_eoq": eoq,
        "lead_time_demand_units": round(lead_time_demand, 1),
        "fabric_bom_meters": fabric_bom_meters,
        "standard_minute_hours": smv_man_hours,
        "modular_sewing_lines_needed": sewing_lines_needed,
        "stock_status": "REORDER_TRIGGERED" if request.current_inventory <= reorder_point else "STOCK_HEALTHY",
        "units_to_order": max(0.0, round(reorder_point + eoq - request.current_inventory, 1)),
    }

    return PeriodDemandForecastResponse(
        target_period=request.target_period,
        product_identifier=request.product_identifier,
        horizon_days=request.horizon_days,
        baseline_demand=baseline_demand,
        forecasted_demand=forecasted_demand,
        daily_run_rate=daily_run_rate,
        demand_uncertainty=demand_uncertainty,
        confidence_interval_lower=ci_lower,
        confidence_interval_upper=ci_upper,
        factor_multiplier_composite=composite_mult,
        factor_breakdown=breakdown,
        inventory_handoff_payload=inventory_payload,
        material_requirements=material_reqs,
    )



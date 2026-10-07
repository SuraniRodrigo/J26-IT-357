from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.integration.mock_upstream import (
    CombinedUpstreamRecord,
    get_combined_upstream_signal,
    list_all_mock_products,
)
from app.schemas.inventory import (
    InventoryOptimizationRequest,
    InventoryOptimizationResponse,
    InventoryPolicySchema,
    InventorySummaryResponse,
    ProductCatalogItem,
    ProductionInterfaceItem,
    ResearchResultsResponse,
    ScenarioAnalysisRequest,
    ScenarioAnalysisResponse,
)
from app.services.inventory_service import (
    get_inventory_summary,
    get_product_catalog,
    get_production_interface,
    get_research_results,
    legacy_optimize_inventory,
    optimize_inventory,
    run_scenario_analysis,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/health")
def inventory_health() -> dict[str, str]:
    """Module health check and system versioning."""
    return {
        "module": "Inventory Guardian (Disruption-Aware Adaptive Inventory Optimization)",
        "status": "healthy",
        "policy_version": "inventory-policy-v1.0",
        "backorder_model_version": "backorder-xgb-v1.0",
        "upstream_mode": "DEMO (Mock Upstream Provider)",
    }


@router.get("/products", response_model=list[ProductCatalogItem])
def list_products() -> list[ProductCatalogItem]:
    """Returns the full catalog of monitored materials with upstream demand and risk feeds."""
    try:
        return get_product_catalog()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/summary", response_model=InventorySummaryResponse)
def inventory_summary() -> InventorySummaryResponse:
    """Returns aggregated executive KPIs for inventory health across all monitored SKUs."""
    try:
        return get_inventory_summary()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/optimize", response_model=list[InventoryPolicySchema])
def inventory_optimize(request: InventoryOptimizationRequest) -> list[InventoryPolicySchema]:
    """
    Executes the 10-step adaptive inventory optimization pipeline.
    Returns backward-compatible list format expected by existing frontends.
    """
    try:
        return legacy_optimize_inventory(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {exc}") from exc


@router.post("/optimize/detailed", response_model=InventoryOptimizationResponse)
def inventory_optimize_detailed(request: InventoryOptimizationRequest) -> InventoryOptimizationResponse:
    """
    Executes the comprehensive optimization pipeline returning full policy metadata.
    """
    try:
        return optimize_inventory(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {exc}") from exc


@router.post("/scenario", response_model=ScenarioAnalysisResponse)
def inventory_scenario_analysis(request: ScenarioAnalysisRequest) -> ScenarioAnalysisResponse:
    """
    Stress tests inventory policies across Normal, Moderate, and Severe disruption scenarios.
    """
    try:
        return run_scenario_analysis(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scenario analysis failed: {exc}") from exc


@router.get("/production-interface", response_model=list[ProductionInterfaceItem])
def production_interface() -> list[ProductionInterfaceItem]:
    """
    Downstream integration contract for Module 4 (Line Optimizer).
    Provides material availability, shortages, and lead times for production line scheduling.
    """
    try:
        return get_production_interface()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/research-results", response_model=ResearchResultsResponse)
def research_results() -> ResearchResultsResponse:
    """
    Serves authentic experimental research metrics (Baseline vs Adaptive vs Forecast-Risk-Aware).
    """
    try:
        return get_research_results()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/demo-upstream", response_model=list[CombinedUpstreamRecord])
def list_demo_upstream_feeds() -> list[CombinedUpstreamRecord]:
    """
    Exposes raw mock upstream feeds for evaluation and transparency.
    """
    try:
        return list_all_mock_products()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

from __future__ import annotations

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml.demand.hierarchical_mint import HierarchicalReconciler
from app.ml.demand.model import DemandModelService
from app.schemas.demand import DemandForecastRequest
from app.services.demand_service import generate_forecast, get_hierarchy_metadata

client = TestClient(app)


def test_hierarchical_reconciler_mathematical_coherence():
    """
    Test that MinT, BU, and TD produce 100% mathematically coherent forecasts
    satisfying y = S * y_bottom with zero discrepancy.
    """
    # 2-level hierarchy: 1 Top, 2 Bottoms (m=3, k=2)
    # S = [[1, 1], [1, 0], [0, 1]]
    S = np.array([
        [1.0, 1.0],  # Total
        [1.0, 0.0],  # Bottom 1
        [0.0, 1.0],  # Bottom 2
    ])
    node_names = ["Total", "Bottom_1", "Bottom_2"]
    bottom_names = ["Bottom_1", "Bottom_2"]

    reconciler = HierarchicalReconciler(
        node_names=node_names,
        bottom_node_names=bottom_names,
        summing_matrix=S,
        historical_proportions=np.array([0.6, 0.4]),
    )

    # Incoherent base forecasts
    # Top = 100, Bottom 1 = 60, Bottom 2 = 50 (Sum of bottoms = 110 != 100)
    y_hat = np.array([100.0, 60.0, 50.0])

    # Fit synthetic residuals
    residuals = np.random.RandomState(42).randn(50, 3)
    reconciler.fit_covariance(residuals, shrinkage=0.1)

    for method in ["MinT", "BU", "TD", "OLS"]:
        y_tilde = reconciler.reconcile(y_hat, method=method)
        coherence = reconciler.check_coherence(y_tilde)
        
        assert coherence["is_coherent"], f"Method {method} failed coherence check"
        assert coherence["max_discrepancy"] < 1e-4, f"Method {method} has discrepancy > 0"
        assert np.all(y_tilde >= 0.0), f"Method {method} produced negative forecasts"
        # Total must equal Bottom 1 + Bottom 2
        assert np.isclose(y_tilde[0], y_tilde[1] + y_tilde[2]), f"Method {method} sum mismatch"


def test_demand_model_service_inference():
    """
    Test DemandModelService forecasting and canonical node resolution.
    """
    service = DemandModelService.get_instance()
    assert service.is_loaded, "Artifact should be loaded in test environment"

    # Test Root
    forecast_root = service.forecast("LK-APPAREL-CLUSTER-ALL", horizon_days=30, model_version="Hierarchical-MinT-LK-v2.4 (MinT)")
    assert len(forecast_root) == 30
    assert all(f.forecasted_demand is not None and f.forecasted_demand >= 0 for f in forecast_root)

    # Test Specific Style SKU
    forecast_sku = service.forecast("Seamless Comfort Bralette", horizon_days=60, model_version="Hierarchical-MinT-LK-v2.4 (BU)")
    assert len(forecast_sku) == 60
    assert all(f.forecasted_demand is not None for f in forecast_sku)

    # Total aggregate demand must be larger than individual bottom item demand
    avg_root = sum(f.forecasted_demand for f in forecast_root) / len(forecast_root)
    avg_sku = sum(f.forecasted_demand for f in forecast_sku) / len(forecast_sku)
    assert avg_root > avg_sku, "Total cluster demand must exceed individual SKU demand"


def test_demand_api_endpoints():
    """
    Test FastAPI /api/demand/forecast and /api/demand/hierarchy endpoints.
    """
    # 1. Forecast endpoint with MinT
    payload = {
        "product_id": "LK-BIY-VS-BR-01",
        "forecast_horizon_days": 30,
        "model_version": "Hierarchical-MinT-LK-v2.4 (MinT)",
    }
    res = client.post("/api/demand/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 30
    assert data[0]["product_id"] == "LK-BIY-VS-BR-01"
    assert data[0]["forecasted_demand"] >= 0.0

    # 2. Hierarchy metadata endpoint
    res_meta = client.get("/api/demand/hierarchy")
    assert res_meta.status_code == 200
    meta = res_meta.json()
    assert meta["model_name"] == "M5-Hierarchical-MinT-Forecaster"
    assert meta["total_nodes_m"] > 0
    assert "MinT" in meta["available_methods"]


def test_negative_horizon_validation():
    """
    Validate that non-positive horizons return HTTP 400.
    """
    res = client.post("/api/demand/forecast", json={"product_id": "SKU-001", "forecast_horizon_days": 0})
    assert res.status_code == 422 or res.status_code == 400

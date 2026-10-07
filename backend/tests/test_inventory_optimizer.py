import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.inventory.inventory_optimizer import InventoryOptimizer
from app.ml.inventory.policy_engine import PolicyEngine
from app.ml.inventory.risk_adjustment import (
    classify_inventory_risk_level,
    compute_risk_factor,
    evaluate_risk_profile,
)
from app.ml.inventory.backorder_model import BackorderRiskModel
from app.integration.mock_upstream import get_combined_upstream_signal, list_all_mock_products


client = TestClient(app)


def test_risk_factor_computation():
    assert compute_risk_factor(0.00, "NORMAL") == 1.00
    assert compute_risk_factor(0.25, "NORMAL") == 1.25
    assert compute_risk_factor(0.50, "NORMAL") == 1.50
    assert compute_risk_factor(1.00, "NORMAL") == 2.00
    # Scenarios
    assert compute_risk_factor(0.00, "MODERATE") == 1.50
    assert compute_risk_factor(0.00, "SEVERE") == 2.00


def test_risk_level_classification():
    assert classify_inventory_risk_level(0.10, material_shortage=0, current_inventory=1000, safety_stock=200) == "LOW"
    assert classify_inventory_risk_level(0.35, material_shortage=0, current_inventory=1000, safety_stock=200) == "MEDIUM"
    assert classify_inventory_risk_level(0.70, material_shortage=0, current_inventory=1000, safety_stock=200) == "HIGH"
    assert classify_inventory_risk_level(0.10, material_shortage=500, current_inventory=500, safety_stock=200) == "CRITICAL"


def test_policy_engine_formulas():
    engine = PolicyEngine()
    # Risk-adjusted lead time
    risk_lt = engine.compute_risk_adjusted_lead_time(average_lead_time=3.5, disruption_probability=0.5)
    assert risk_lt == round(3.5 * 1.5, 4)

    # Risk-adjusted safety stock
    ss = engine.compute_risk_adjusted_safety_stock(
        z_value=1.645,
        risk_adjusted_lead_time=5.25,
        demand_std_dev=38.87,
        forecasted_demand=373.79,
        lead_time_std_dev=1.62,
    )
    assert ss > 0

    # Risk-aware ROP
    lt_demand = engine.compute_forecast_lead_time_demand(373.79, risk_lt)
    rop = engine.compute_reorder_point(lt_demand, ss)
    assert rop == round(lt_demand + ss, 4)

    # Risk-aware ROQ
    roq = engine.compute_reorder_quantity(forecasted_demand=373.79, replenishment_cycle_days=7, disruption_probability=0.5)
    assert roq == round(373.79 * 7 * 1.5, 4)


def test_inventory_optimizer_pipeline():
    optimizer = InventoryOptimizer()
    res = optimizer.optimize(
        product_id="FAB-001",
        current_inventory=3400.0,
        forecasted_demand=15200.0,
        average_lead_time=7.0,
        lead_time_std_dev=3.2,
        demand_std_dev=2280.0,
        disruption_probability=0.85,
    )
    assert res.product_id == "FAB-001"
    assert res.risk_adjusted_lead_time == round(7.0 * 1.85, 2)
    assert res.material_requirement == 15200.0
    assert res.material_shortage == 11800.0
    assert res.material_availability_flag is False
    assert res.risk_level == "CRITICAL"
    assert "CRITICAL SHORTAGE" in res.reorder_recommendation


def test_optimizer_negative_inventory_raises():
    optimizer = InventoryOptimizer()
    with pytest.raises(ValueError):
        optimizer.optimize(product_id="FAB-001", current_inventory=-50.0, forecasted_demand=100.0)


def test_backorder_xgboost_adapter():
    bo_model = BackorderRiskModel()
    res = bo_model.predict_backorder_risk(
        product_id="FAB-001",
        current_inventory=50.0,
        lead_time=12.0,
        forecasted_demand=5000.0,
    )
    assert res.model_version == "backorder-xgb-v1.0"
    assert 0.0 <= res.backorder_probability <= 1.0
    assert res.is_auxiliary_signal is True


def test_mock_upstream_signals():
    prod = get_combined_upstream_signal("FAB-001")
    assert prod.product_id == "FAB-001"
    assert prod.is_demo_data is True
    assert prod.disruption_probability > 0

    all_prods = list_all_mock_products()
    assert len(all_prods) >= 4


def test_api_health():
    r = client.get("/api/inventory/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_api_products():
    r = client.get("/api/inventory/products")
    assert r.status_code == 200
    assert len(r.json()) >= 4


def test_api_summary():
    r = client.get("/api/inventory/summary")
    assert r.status_code == 200
    assert "total_materials_monitored" in r.json()
    assert "stockout_mitigation_pct" in r.json()


def test_api_optimize():
    payload = {
        "product_id": "FAB-001",
        "current_inventory": 3400.0,
        "forecasted_demand": 15200.0,
        "demand_std_dev": 2280.0,
        "average_lead_time": 7.0,
        "lead_time_std_dev": 3.2,
        "disruption_probability": 0.85,
        "service_level": 0.95,
        "replenishment_cycle_days": 7,
    }
    r = client.post("/api/inventory/optimize", json=payload)
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["product_id"] == "FAB-001"
    assert items[0]["material_availability_flag"] is False


def test_api_scenario():
    payload = {
        "product_id": "FAB-001",
        "current_inventory": 3400.0,
        "forecasted_demand": 15200.0,
        "base_disruption_prob": 0.35,
    }
    r = client.post("/api/inventory/scenario", json=payload)
    assert r.status_code == 200
    scenarios = r.json()["scenarios"]
    assert "NORMAL" in scenarios
    assert "MODERATE" in scenarios
    assert "SEVERE" in scenarios


def test_api_production_interface():
    r = client.get("/api/inventory/production-interface")
    assert r.status_code == 200
    assert len(r.json()) >= 4


def test_api_research_results():
    r = client.get("/api/inventory/research-results")
    assert r.status_code == 200
    data = r.json()
    assert data["observed_improvements"]["stockout_reduction_pct"] > 90.0
    assert data["backorder_xgboost_metrics"]["roc_auc"] == 0.9059

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_dashboard_endpoint():
    response = client.get('/api/dashboard/summary')
    assert response.status_code == 200
    assert 'modules' in response.json()


def test_demand_endpoint():
    response = client.post('/api/demand/forecast', json={'product_id': 'SKU-001', 'forecast_horizon_days': 2})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.parametrize(("overrides", "expected_message"), [
    ({"current_inventory": 0, "forecasted_demand": 0}, "cannot both be zero"),
    ({"category": "Dyes & Chemicals"}, "must start with 'DYE-'"),
    ({"disruption_probability": 1.5}, "less than or equal to 1"),
    ({"product_name": "100 Cotton"}, "Only letters and spaces are allowed"),
    ({"product_name": "A"}, "at least 2 characters"),
    ({"product_name": "Cotton*Jersey"}, "Only letters and spaces are allowed"),
    ({"product_name": "x" * 101}, "at most 100 characters"),
])
def test_create_inventory_rejects_invalid_catalog_data(overrides, expected_message):
    payload = {
        "product_id": "FAB-009",
        "product_name": "Demo Cotton Fabric",
        "category": "Fabrics",
        "unit": "kg",
        "current_inventory": 25,
        "forecasted_demand": 100,
        "demand_std_dev": 10,
        "average_lead_time": 5,
        "lead_time_std_dev": 1,
        "disruption_probability": 0.2,
        "supplier_trust_score": 80,
    }
    response = client.post("/api/inventory/products", json={**payload, **overrides})

    assert response.status_code == 422
    assert expected_message in response.text


def test_inventory_optimize_rejects_zero_stock_and_demand():
    response = client.post(
        "/api/inventory/optimize/detailed",
        json={"product_id": "FAB-009", "current_inventory": 0, "forecasted_demand": 0},
    )

    assert response.status_code == 422
    assert "cannot both be zero" in response.text


def test_inventory_optimize_preserves_demand_forecast_horizon():
    response = client.post(
        "/api/inventory/optimize/detailed",
        json={
            "product_id": "LK-APP-001",
            "current_inventory": 5200,
            "in_transit_qty": 900,
            "forecasted_demand": 614,
            "forecast_horizon_days": 30,
            "demand_std_dev": 92,
            "average_lead_time": 14,
            "expected_delay_days": 2,
            "lead_time_std_dev": 3,
            "disruption_probability": 0.18,
            "supplier_trust_score": 82,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["forecast_horizon_days"] == 30
    assert result["expected_delay_days"] == 2
    assert result["risk_adjusted_lead_time"] == 18.88
    assert result["material_requirement"] == 18420
    assert result["material_shortage"] == 13220


def test_create_demand_product_persists_csv_fields_and_stock():
    payload = {
        "product_id": "LK-APP-997",
        "product_name": "Demo Training Leggings",
        "category": "Activewear",
        "unit": "pcs",
        "current_inventory": 5200,
        "in_transit_qty": 900,
        "forecasted_demand": 614,
        "demand_std_dev": 92,
        "average_lead_time": 14,
        "lead_time_std_dev": 3,
        "disruption_probability": 0.18,
        "supplier_trust_score": 82,
        "is_demand_product": True,
        "department": "Apparel",
        "export_markets": "USA, Europe",
        "unit_price_usd": 49.99,
        "historical_orders": 24515,
        "total_historical_units": 73698,
        "projected_demand_30d": 18420,
        "fabric_requirement": 11973,
        "sewing_smv_minutes": 22.8,
        "planning_status": "Ready for production",
        "demand_forecast_horizon_days": 30,
    }
    response = client.post("/api/inventory/products", json=payload)

    try:
        assert response.status_code == 201, response.text
        created = response.json()
        assert created["product_id"] == payload["product_id"]
        assert created["in_transit_qty"] == 900
        assert created["projected_demand_30d"] == 18420
        assert created["forecasted_demand"] == 614
        assert created["is_demand_product"] is True
    finally:
        if response.status_code == 201:
            client.delete(f"/api/inventory/products/{payload['product_id']}")


def test_inventory_scenario_preserves_demand_forecast_horizon():
    response = client.post(
        "/api/inventory/scenario",
        json={
            "product_id": "LK-APP-001",
            "current_inventory": 5200,
            "in_transit_qty": 900,
            "forecasted_demand": 614,
            "forecast_horizon_days": 30,
            "demand_std_dev": 92,
            "average_lead_time": 14,
            "expected_delay_days": 2,
            "lead_time_std_dev": 3,
            "base_disruption_prob": 0.18,
            "supplier_trust_score": 82,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["forecast_horizon_days"] == 30
    assert result["expected_delay_days"] == 2
    assert result["scenarios"]["NORMAL"]["material_shortage"] == 13220
    assert result["scenarios"]["NORMAL"]["risk_adjusted_lead_time"] == 18.88


def test_demo_supplier_risk_endpoint_returns_matched_sku_data():
    response = client.get("/api/inventory/demo-demand-supplier-risk/LK-APP-001")

    assert response.status_code == 200
    supplier = response.json()
    assert supplier["product_id"] == "LK-APP-001"
    assert supplier["supplier_name"] == "TexLanka Mills"
    assert supplier["expected_delay_days"] == 2
    assert supplier["risk_score_pct"] == 98.5
    assert supplier["supplier_trust_score"] == 1.5
    assert supplier["risk_level"] == "HIGH"


@pytest.mark.parametrize(("updates", "expected_message"), [
    ({"current_inventory": 0, "forecasted_demand": 0}, "cannot both be zero"),
    ({"category": "Dyes & Chemicals"}, "belongs to the 'Fabrics' category"),
])
def test_update_inventory_rejects_inconsistent_catalog_data(updates, expected_message):
    response = client.put("/api/inventory/products/FAB-001", json=updates)

    assert response.status_code == 400
    assert expected_message in response.json()["detail"]

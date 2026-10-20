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


@pytest.mark.parametrize(("updates", "expected_message"), [
    ({"current_inventory": 0, "forecasted_demand": 0}, "cannot both be zero"),
    ({"category": "Dyes & Chemicals"}, "belongs to the 'Fabrics' category"),
])
def test_update_inventory_rejects_inconsistent_catalog_data(updates, expected_message):
    response = client.put("/api/inventory/products/FAB-001", json=updates)

    assert response.status_code == 400
    assert expected_message in response.json()["detail"]

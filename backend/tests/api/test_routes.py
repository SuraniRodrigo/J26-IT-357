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


def test_demand_drivers_endpoint():
    response = client.get('/api/demand/drivers')
    assert response.status_code == 200
    data = response.json()
    assert 'fashion_trends' in data
    assert 'seasonal_demands' in data
    assert 'color_preferences' in data
    assert 'buyer_behaviour' in data
    assert len(data['fashion_trends']) >= 3
    assert len(data['seasonal_demands']) == 4
    assert len(data['color_preferences']) == 5
    assert len(data['buyer_behaviour']) == 4


def test_demand_forecast_period_and_inventory_handoff():
    payload = {
        "target_period": "November 2026",
        "horizon_days": 30,
        "product_identifier": "Seamless Athleisure & Active Bralettes",
        "current_inventory": 4000.0,
        "factors": {
            "fashion_trend_growth_pct": 28.0,
            "seasonal_multiplier": 1.35,
            "color_preference_score": 88.0,
            "buyer_behaviour_weight": 1.20,
            "promotion_lift_pct": 15.0,
        },
    }
    response = client.post('/api/demand/forecast-period', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['target_period'] == "November 2026"
    assert data['forecasted_demand'] > 0
    assert data['factor_multiplier_composite'] > 1.0
    assert len(data['factor_breakdown']) == 5
    assert 'inventory_handoff_payload' in data
    assert 'material_requirements' in data

    # Test that the inventory_handoff_payload directly feeds /api/inventory/optimize
    inv_response = client.post('/api/inventory/optimize', json=data['inventory_handoff_payload'])
    assert inv_response.status_code == 200
    inv_data = inv_response.json()
    assert len(inv_data) == 1
    assert inv_data[0]['forecasted_demand'] == data['forecasted_demand']
    assert inv_data[0]['safety_stock'] is not None
    assert inv_data[0]['selected_reorder_point'] is not None



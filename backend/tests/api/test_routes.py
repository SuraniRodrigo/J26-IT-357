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


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


def test_supply_predict_endpoint():
    payload = {
        'days_for_shipping_real': 4,
        'days_for_shipment_scheduled': 2,
        'category_id': 17,
        'shipping_mode': 'Standard Class',
        'order_region': 'Western Europe',
    }
    response = client.post('/api/supply/predict', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['shipping_variance'] == 2
    assert 0 <= data['disruption_probability_percent'] <= 100
    assert 0 <= data['supplier_trust_score'] <= 100
    assert data['risk_level'] in ['low', 'medium', 'high']
    assert isinstance(data['early_warning_alert'], bool)


def test_supply_history_endpoint():
    response = client.get('/api/supply/history?limit=10')
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    record = data[0]
    assert 'id' in record
    assert 'disruption_probability' in record
    assert 'risk_level' in record
    assert record['model_version'] == 'xgboost-v1.0'


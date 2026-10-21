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
        'product_name': 'Organic Cotton Denim Fabric',
        'category_name': 'Knitted Fabric',
        'supplier_name': 'TexLanka Mills',
        'year': 2026,
        'month': 5,
        'scheduled_shipping_days': 4,
        'expected_delay_days': 2,
        'shipping_mode': 'Standard Class',
        'order_region': 'Western Europe',
    }
    response = client.post('/api/supply/predict', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['product_name'] == 'Organic Cotton Denim Fabric'
    assert data['supplier_name'] == 'TexLanka Mills'
    assert data['actual_shipping_days'] == 6
    assert data['shipping_variance'] == 2
    assert 0 <= data['risk_score'] <= 100
    assert 0 <= data['trust_score'] <= 100
    # Enforce strict inverse relationship
    assert data['trust_score'] == round(100.0 - data['risk_score'], 2)
    assert data['risk_level'] in ['low', 'medium', 'high']
    assert isinstance(data['early_warning_alert'], bool)
    assert data['seasonal_risk_applied'] is True


def test_supply_predict_seasonal_and_delay_effects():
    # Base on-time non-monsoon
    on_time_feb = client.post('/api/supply/predict', json={
        'product_name': 'Organic Cotton Denim Fabric',
        'category_name': 'Knitted Fabric',
        'supplier_name': 'TexLanka Mills',
        'year': 2026,
        'month': 2,
        'scheduled_shipping_days': 4,
        'expected_delay_days': 0,
        'shipping_mode': 'Standard Class',
        'order_region': 'Western Europe',
    }).json()

    # Delayed non-monsoon
    delayed_feb = client.post('/api/supply/predict', json={
        'product_name': 'Organic Cotton Denim Fabric',
        'category_name': 'Knitted Fabric',
        'supplier_name': 'TexLanka Mills',
        'year': 2026,
        'month': 2,
        'scheduled_shipping_days': 4,
        'expected_delay_days': 4,
        'shipping_mode': 'Standard Class',
        'order_region': 'Western Europe',
    }).json()

    # Delayed monsoon (month 5 = May) — use 2d delay so clamp headroom exists for monsoon uplift
    delayed_may = client.post('/api/supply/predict', json={
        'product_name': 'Organic Cotton Denim Fabric',
        'category_name': 'Knitted Fabric',
        'supplier_name': 'TexLanka Mills',
        'year': 2026,
        'month': 5,
        'scheduled_shipping_days': 4,
        'expected_delay_days': 2,
        'shipping_mode': 'Standard Class',
        'order_region': 'Western Europe',
    }).json()

    # Delay penalty increases risk
    assert delayed_feb['risk_score'] > on_time_feb['risk_score']
    assert delayed_feb['trust_score'] < on_time_feb['trust_score']

    # Monsoon season increases risk further (flat +20% on top of delay penalty)
    assert delayed_may['risk_score'] > on_time_feb['risk_score']
    assert delayed_may['trust_score'] < on_time_feb['trust_score']
    assert delayed_may['seasonal_risk_applied'] is True
    assert on_time_feb['seasonal_risk_applied'] is False
    assert delayed_may['trust_score'] == round(100.0 - delayed_may['risk_score'], 2)


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


def test_supply_export_endpoint():
    response = client.get('/api/supply/export?format=csv')
    assert response.status_code == 200
    assert 'text/csv' in response.headers['content-type']
    assert 'supplier_risk_report.csv' in response.headers.get('content-disposition', '')
    content = response.text
    # Verify updated product-wise column headers
    assert 'Timestamp' in content
    assert 'Product Name' in content
    assert 'Category Name' in content
    assert 'Supplier Name' in content
    assert 'Risk Score (%)' in content
    assert 'Trust Score (%)' in content
    assert 'Risk Level' in content


def test_supply_export_pdf_endpoint():
    response = client.get('/api/supply/export?format=pdf')
    assert response.status_code == 200
    assert 'application/pdf' in response.headers['content-type']
    assert 'supplier_risk_report.pdf' in response.headers.get('content-disposition', '')
    # Verify it's a valid PDF (starts with %PDF)
    assert response.content[:4] == b'%PDF'


def test_supply_latest_risk_endpoint():
    response = client.get('/api/supply/latest-risk')
    assert response.status_code == 200
    data = response.json()
    assert 'disruption_probability' in data
    assert 0 <= data['disruption_probability'] <= 1
    assert 0 <= data['disruption_probability_percent'] <= 100
    assert 0 <= data['supplier_trust_score'] <= 100
    assert data['risk_level'] in ['low', 'medium', 'high']
    assert data['model_version'] == 'xgboost-v1.0'
    assert isinstance(data['valid_upstream_risk_signal'], bool)
    assert isinstance(data['early_warning_alert'], bool)
    assert 'product_name' in data
    assert 'supplier_name' in data
    assert 'risk_score' in data
    assert 'trust_score' in data
    assert 'expected_delay_days' in data



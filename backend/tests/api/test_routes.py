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


def test_optimizer_recalculate_reroutes_affected_batch():
    response = client.post(
        '/api/v1/optimizer/recalculate',
        json={
            'line_id': 'Line Alpha',
            'disruption_type': 'Machine Failure',
            'severity_minutes': 45,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result['status'] == 'success'
    assert result['affected_line'] == 'Line Alpha'
    assert result['rerouted_target_line'] == 'Line Gamma'
    assert result['recovery_time_seconds'] == 14
    assert result['updated_sequences'][0]['line_status'] == 'disruption_detected'
    target_sequence = next(
        sequence
        for sequence in result['updated_sequences']
        if sequence['line_id'] == 'Line Gamma'
    )
    assert 'BATCH-1042' in target_sequence['current_active_batches']
    assert target_sequence['capacity_metrics']['rerouted_load_percent'] == 22


def test_optimizer_recalculate_rejects_negative_severity():
    response = client.post(
        '/api/v1/optimizer/recalculate',
        json={
            'line_id': 'Line Alpha',
            'disruption_type': 'Machine Failure',
            'severity_minutes': -1,
        },
    )

    assert response.status_code == 422


def test_optimizer_endpoint_allows_vite_frontend_cors():
    response = client.options(
        '/api/v1/optimizer/recalculate',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
        },
    )

    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'

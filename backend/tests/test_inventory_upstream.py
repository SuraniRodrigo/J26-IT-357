"""
Unit and Integration Tests for Module 3 Upstream Adapters & Input Range Validations
Tests live vs demo upstream signal consumption and boundary conditions.
"""

import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.integration.upstream_adapter import (
    get_upstream_signals,
    list_all_upstream_products,
    get_live_upstream_signals,
)
from app.services.inventory_service import get_all_upstream_signals_service

client = TestClient(app)


def test_get_all_upstream_endpoint():
    """Verify GET /api/inventory/upstream returns live/demo upstream signal feeds."""
    response = client.get("/api/inventory/upstream")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first_item = data[0]
    assert "product_id" in first_item
    assert "product_name" in first_item
    assert "forecasted_demand" in first_item
    assert "supplier_trust_score" in first_item
    assert "disruption_probability" in first_item
    assert first_item["forecasted_demand"] > 0
    assert 0.0 <= first_item["disruption_probability"] <= 1.0


def test_get_upstream_endpoint_filter_by_sku():
    """Verify GET /api/inventory/upstream?product_id=RAW-COT-001 filters correctly."""
    response = client.get("/api/inventory/upstream?product_id=RAW-COT-001")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["product_id"] == "RAW-COT-001"


def test_upstream_adapter_demo_mode_fallback():
    """Verify upstream adapter correctly falls back to demo data when configured."""
    with patch.dict(os.environ, {"USE_DEMO_UPSTREAM": "true"}):
        signals = get_upstream_signals("RAW-COT-001")
        assert signals is not None
        assert signals["product_id"] == "RAW-COT-001"
        assert signals["forecasted_demand"] > 0
        assert signals["supplier_trust_score"] > 0


def test_upstream_service_returns_structured_signals():
    """Verify get_all_upstream_signals_service returns valid records for all catalog items."""
    signals = get_all_upstream_signals_service()
    assert isinstance(signals, list)
    assert len(signals) >= 5
    sku_ids = [s["product_id"] for s in signals]
    assert "RAW-COT-001" in sku_ids


def test_optimize_endpoint_negative_inventory_rejected():
    """Verify POST /api/inventory/optimize rejects physically impossible negative stock."""
    payload = {
        "product_id": "RAW-COT-001",
        "current_inventory": -500,  # Physically impossible in WMS
        "in_transit_qty": 100,
        "average_lead_time": 5.0,
        "forecasted_demand": 300.0,
        "demand_std_dev": 25.0,
        "lead_time_std_dev": 1.2,
        "supplier_trust_score": 0.85,
        "disruption_probability": 0.15,
        "service_level": 0.95,
        "disruption_scenario": "NORMAL",
        "policy_type": "FORECAST_RISK_AWARE",
    }
    response = client.post("/api/inventory/optimize", json=payload)
    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "cannot be negative" in detail.lower() or "inventory" in detail.lower()


def test_optimize_endpoint_valid_payload_succeeds():
    """Verify POST /api/inventory/optimize succeeds with valid bounded ranges."""
    payload = {
        "product_id": "RAW-COT-001",
        "current_inventory": 1500,
        "in_transit_qty": 300,
        "average_lead_time": 4.5,
        "forecasted_demand": 350.0,
        "demand_std_dev": 30.0,
        "lead_time_std_dev": 1.5,
        "supplier_trust_score": 0.88,
        "disruption_probability": 0.12,
        "service_level": 0.95,
        "disruption_scenario": "NORMAL",
        "policy_type": "FORECAST_RISK_AWARE",
    }
    response = client.post("/api/inventory/optimize", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert "reorder_point" in result
    assert "reorder_quantity" in result
    assert "safety_stock" in result
    assert result["safety_stock"] >= 0

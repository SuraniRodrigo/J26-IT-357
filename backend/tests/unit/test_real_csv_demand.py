from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.demand_repository import DemandRepository
from app.services.demand_service import (
    generate_forecast,
    get_datasets_summary,
    get_real_categories,
    get_real_departments,
    get_real_historical,
    get_real_products,
)
from app.schemas.demand import DemandForecastRequest, DemandReconcileRequest

client = TestClient(app)


def test_demand_repository_dataco_loading():
    """
    Test that DemandRepository loads real DataCo CSV data and aggregates products.
    """
    repo = DemandRepository.get_instance()
    products = repo.get_dataco_products(limit=10)
    assert len(products) > 0, "DataCo products should be populated from real CSV"

    first_prod = products[0]
    assert "product_name" in first_prod
    assert "total_orders" in first_prod
    assert first_prod["total_orders"] > 0
    assert "avg_price" in first_prod


def test_demand_repository_categories_and_departments():
    """
    Test retrieval of real categories and departments from DataCo and M5.
    """
    repo = DemandRepository.get_instance()
    categories = repo.get_dataco_categories()
    departments = repo.get_dataco_departments()

    assert len(categories) > 0, "Categories should be derived from real CSV"
    assert len(departments) > 0, "Departments should be derived from real CSV"

    # Verify expected departments exist
    dept_names = [d["department_name"] for d in departments]
    assert any("Apparel" in d or "Golf" in d or "Footwear" in d for d in dept_names)


def test_empirical_forecast_from_real_csv():
    """
    Test that empirical forecasts are derived from authentic CSV historical series
    without fake simulated sine waves.
    """
    repo = DemandRepository.get_instance()
    # Test on a real product
    p_name = "Nike Men's Dri-FIT Victory Golf Polo"
    records = repo.get_empirical_forecast(p_name, horizon_days=14)

    assert len(records) == 14
    for r in records:
        assert r["product_id"] == p_name
        assert r["forecasted_demand"] >= 0.0
        assert r["lower_bound"] <= r["upper_bound"]
        assert "real_csv" in r["data_source"]


def test_api_products_endpoint():
    """
    Test GET /api/demand/products endpoint.
    """
    res = client.get("/api/demand/products?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 5
    assert "product_name" in data[0]
    assert "total_sales" in data[0]


def test_api_categories_and_departments_endpoint():
    """
    Test GET /api/demand/categories and /api/demand/departments endpoints.
    """
    res_cat = client.get("/api/demand/categories?source=dataco")
    assert res_cat.status_code == 200
    cats = res_cat.json()
    assert len(cats) > 0

    res_dept = client.get("/api/demand/departments?source=dataco")
    assert res_dept.status_code == 200
    depts = res_dept.json()
    assert len(depts) > 0


def test_api_historical_observations_endpoint():
    """
    Test GET /api/demand/historical endpoint returns real CSV daily points.
    """
    res = client.get("/api/demand/historical?identifier=Nike Men's Dri-FIT Victory Golf Polo&days=30")
    assert res.status_code == 200
    data = res.json()
    assert data["identifier"] == "Nike Men's Dri-FIT Victory Golf Polo"
    assert len(data["data_points"]) > 0
    assert data["total_quantity"] > 0


def test_api_dataset_summary_endpoint():
    """
    Test GET /api/demand/dataset-summary endpoint.
    """
    res = client.get("/api/demand/dataset-summary")
    assert res.status_code == 200
    summary = res.json()
    assert "dataco" in summary
    assert "m5" in summary
    assert summary["dataco"]["loaded"] is True
    assert summary["dataco"]["total_records"] > 100000


def test_api_reconcile_endpoint():
    """
    Test POST /api/demand/reconcile endpoint with MinT reconciliation.
    """
    payload = {
        "forecast_horizon_days": 14,
        "reconciliation_method": "MinT",
        "buyer_surge_factor": 5.0,
    }
    res = client.post("/api/demand/reconcile", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["reconciliation_method"] == "MinT"
    assert data["is_coherent"] is True
    assert len(data["nodes"]) > 0
    assert data["root_total_forecast"] > 0


def test_api_forecast_real_dataco_product():
    """
    Test POST /api/demand/forecast for a real product from DataCo.
    """
    payload = {
        "product_id": "Nike Men's Dri-FIT Victory Golf Polo",
        "forecast_horizon_days": 10,
        "data_source": "dataco",
    }
    res = client.post("/api/demand/forecast", json=payload)
    assert res.status_code == 200
    records = res.json()
    assert len(records) == 10
    assert records[0]["product_id"] == "Nike Men's Dri-FIT Victory Golf Polo"
    assert records[0]["forecasted_demand"] >= 0.0
    assert "dataco" in records[0]["data_source"]

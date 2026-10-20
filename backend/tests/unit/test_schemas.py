from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.demand import DemandForecastSchema
from app.schemas.inventory import (
    CreateProductCatalogItem,
    InventoryOptimizationRequest,
    InventoryPolicySchema,
    UpdateProductCatalogItem,
)
from app.schemas.supply import SupplyRiskSchema


def test_demand_schema_accepts_unavailable_prediction():
    item = DemandForecastSchema(
        product_id='SKU-001',
        forecast_date=date.today(),
        forecasted_demand=None,
        forecast_horizon=7,
        model_version='not-available',
    )
    assert item.product_id == 'SKU-001'
    assert item.forecasted_demand is None


def test_supply_schema_allows_unavailable_risk():
    item = SupplyRiskSchema(
        supplier_id=None,
        vendor_id=None,
        disruption_probability=None,
        risk_level=None,
        risk_signal='No artifact loaded',
        model_version='not-available',
    )
    assert item.risk_signal == 'No artifact loaded'


def test_inventory_schema_accepts_missing_optimization_values():
    item = InventoryPolicySchema(
        product_id='SKU-001',
        order_date=date.today(),
        selected_lead_time=7,
        reorder_recommendation='Awaiting model artifact availability',
    )
    assert item.selected_lead_time == 7
    assert item.material_requirement is None


def valid_catalog_item(**overrides):
    payload = {
        "product_id": "FAB-009",
        "product_name": "Heavy Duty Indigo Denim",
        "category": "Fabrics",
        "unit": "meters",
        "current_inventory": 0,
        "forecasted_demand": 1200,
        "demand_std_dev": 100,
        "average_lead_time": 7,
        "lead_time_std_dev": 1.5,
        "disruption_probability": 0.35,
        "supplier_trust_score": 75,
    }
    return CreateProductCatalogItem(**(payload | overrides))


def test_catalog_item_accepts_zero_stock_with_positive_demand_and_normalizes_sku():
    item = valid_catalog_item(product_id=" fab-009 ")

    assert item.product_id == "FAB-009"
    assert item.current_inventory == 0
    assert item.is_demo_data is False


def test_catalog_item_can_be_marked_as_demo_data():
    item = valid_catalog_item(is_demo_data=True)

    assert item.is_demo_data is True


@pytest.mark.parametrize("overrides", [
    {"current_inventory": 0, "forecasted_demand": 0},
    {"current_inventory": -1},
    {"forecasted_demand": float("inf")},
    {"average_lead_time": 0},
    {"disruption_probability": 1.1},
    {"supplier_trust_score": -1},
])
def test_catalog_item_rejects_meaningless_or_out_of_range_values(overrides):
    with pytest.raises(ValidationError):
        valid_catalog_item(**overrides)


@pytest.mark.parametrize(("product_id", "category"), [
    ("FAB-009", "Dyes & Chemicals"),
    ("DYE-009", "Fabrics"),
    ("TRM-009", "Yarns & Threads"),
])
def test_catalog_item_rejects_sku_category_mismatch(product_id, category):
    with pytest.raises(ValidationError, match="belongs to"):
        valid_catalog_item(product_id=product_id, category=category)


def test_catalog_item_rejects_unknown_category_and_malformed_sku():
    with pytest.raises(ValidationError):
        valid_catalog_item(category="Electronics")
    with pytest.raises(ValidationError):
        valid_catalog_item(product_id="NOT A SKU")


def test_catalog_update_rejects_out_of_range_values():
    with pytest.raises(ValidationError):
        UpdateProductCatalogItem(disruption_probability=1.5)


def test_optimization_rejects_zero_stock_and_zero_demand():
    with pytest.raises(ValidationError, match="cannot both be zero"):
        InventoryOptimizationRequest(
            product_id="FAB-009",
            current_inventory=0,
            forecasted_demand=0,
        )

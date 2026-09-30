from datetime import date

from app.schemas.demand import DemandForecastSchema
from app.schemas.inventory import InventoryPolicySchema
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

from __future__ import annotations

from datetime import date, timedelta

from app.schemas.integration import OptiChainPipelineRequest, OptiChainPipelineResponse
from app.schemas.inventory import InventoryPolicySchema
from app.schemas.production import ProductionScheduleSchema
from app.schemas.supply import SupplyRiskSchema
from app.schemas.demand import DemandForecastSchema


def _demand_placeholder(product_id: str, horizon_days: int) -> list[DemandForecastSchema]:
    base_date = date.today()
    return [
        DemandForecastSchema(
            product_id=product_id,
            forecast_date=base_date + timedelta(days=idx + 1),
            forecasted_demand=None,
            forecast_horizon=horizon_days,
            model_version="not-available",
        )
        for idx in range(horizon_days)
    ]


def _supply_placeholder(product_id: str) -> list[SupplyRiskSchema]:
    return [
        SupplyRiskSchema(
            supplier_id=None,
            vendor_id=None,
            disruption_probability=None,
            risk_level=None,
            risk_signal="No trained artifact loaded. Supply risk is unavailable in the current repository.",
            model_version="not-available",
        )
    ]


def _inventory_placeholder(product_id: str, forecast_horizon_days: int) -> list[InventoryPolicySchema]:
    return [
        InventoryPolicySchema(
            product_id=product_id,
            order_date=date.today() + timedelta(days=idx + 1),
            forecasted_demand=None,
            inventory_before_demand=None,
            inventory_position=None,
            selected_lead_time=7,
            selected_reorder_point=None,
            selected_reorder_quantity=None,
            safety_stock=None,
            material_requirement=None,
            material_shortage=None,
            material_availability_flag=None,
            reorder_recommendation="No trained inventory model available. Not available in the current repository.",
        )
        for idx in range(min(forecast_horizon_days, 1))
    ]


def _production_placeholder(product_id: str) -> list[ProductionScheduleSchema]:
    return [
        ProductionScheduleSchema(
            product_id=product_id,
            schedule_date=date.today(),
            planned_quantity=0.0,
            production_line="line-unassigned",
            due_date=date.today(),
            priority_level=1,
            reschedule_required=False,
        )
    ]


def run_optichain_pipeline(request: OptiChainPipelineRequest) -> OptiChainPipelineResponse:
    demand = []
    for product_id in request.product_ids:
        demand.extend(_demand_placeholder(product_id, request.forecast_horizon_days))

    supply = []
    for product_id in request.product_ids:
        supply.extend(_supply_placeholder(product_id))

    inventory = []
    for product_id in request.product_ids:
        inventory.extend(_inventory_placeholder(product_id, request.forecast_horizon_days))

    production = []
    for product_id in request.product_ids:
        production.extend(_production_placeholder(product_id))

    return OptiChainPipelineResponse(
        demand_forecast=demand,
        supply_risk=supply,
        inventory_policy=inventory,
        production_schedule=production,
        summary={
            "status": "not_available",
            "message": "Model artifacts are not present in the current repository. This scaffold is designed to preserve architecture and explicit contracts without fabricating results.",
            "product_count": len(request.product_ids),
            "forecast_horizon_days": request.forecast_horizon_days,
        },
    )

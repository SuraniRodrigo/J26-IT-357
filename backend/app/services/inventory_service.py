from __future__ import annotations

from datetime import date

import math
from app.schemas.inventory import InventoryOptimizationRequest, InventoryPolicySchema


def optimize_inventory(request: InventoryOptimizationRequest) -> list[InventoryPolicySchema]:
    if request.current_inventory < 0:
        raise ValueError("Current inventory cannot be negative.")

    if request.forecasted_demand and request.forecasted_demand > 0:
        daily_demand = request.forecasted_demand / 30.0
        daily_sigma = (
            request.demand_uncertainty / math.sqrt(30.0)
            if request.demand_uncertainty > 0
            else (daily_demand * 0.12)
        )
        lead_time = max(1, request.lead_time_days)
        lt_var = max(0.5, request.lead_time_variability)

        # Standard safety stock formula with 95% service level factor Z = 1.65
        safety_stock = round(
            1.65 * math.sqrt(lead_time * (daily_sigma ** 2) + (daily_demand ** 2) * (lt_var ** 2)),
            1,
        )
        reorder_point = round((daily_demand * lead_time) + safety_stock, 1)
        reorder_qty = round(math.sqrt((2.0 * request.forecasted_demand * 75.0) / 3.5), 1)

        material_req = round(request.forecasted_demand * 1.85, 1)
        shortage = max(0.0, round(reorder_point - request.current_inventory, 1))
        is_available = request.current_inventory >= reorder_point

        recom = (
            f"REORDER RECOMMENDED: Current inventory ({request.current_inventory:,.0f}) is below Reorder Point ({reorder_point:,.0f}). Order {reorder_qty:,.0f} units."
            if not is_available
            else f"STOCK ADEQUATE: Current stock ({request.current_inventory:,.0f}) satisfies buffer over Reorder Point ({reorder_point:,.0f})."
        )

        return [
            InventoryPolicySchema(
                product_id=request.product_id,
                order_date=request.order_date,
                forecasted_demand=float(request.forecasted_demand),
                inventory_before_demand=float(request.current_inventory),
                inventory_position=float(request.current_inventory),
                selected_lead_time=lead_time,
                selected_reorder_point=reorder_point,
                selected_reorder_quantity=reorder_qty,
                safety_stock=safety_stock,
                material_requirement=material_req,
                material_shortage=shortage,
                material_availability_flag=is_available,
                reorder_recommendation=recom,
            )
        ]

    return [
        InventoryPolicySchema(
            product_id=request.product_id,
            order_date=request.order_date,
            forecasted_demand=None,
            inventory_before_demand=None,
            inventory_position=None,
            selected_lead_time=request.lead_time_days,
            selected_reorder_point=None,
            selected_reorder_quantity=None,
            safety_stock=None,
            material_requirement=None,
            material_shortage=None,
            material_availability_flag=None,
            reorder_recommendation="Inventory optimization artifact is not available in the current repository. No validation result should be fabricated.",
        )
    ]


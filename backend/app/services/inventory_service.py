import math
from datetime import date

from app.schemas.inventory import InventoryOptimizationRequest, InventoryPolicySchema


def optimize_inventory(request: InventoryOptimizationRequest) -> list[InventoryPolicySchema]:
    if request.current_inventory < 0:
        raise ValueError("Current inventory cannot be negative.")

    lead_time = max(1, request.lead_time_days)
    demand_uncertainty = request.demand_uncertainty if request.demand_uncertainty > 0 else max(1.0, request.forecasted_demand * 0.15)
    lead_time_var = request.lead_time_variability if request.lead_time_variability > 0 else 1.0
    daily_demand = request.forecasted_demand / lead_time if lead_time > 0 else request.forecasted_demand

    # Statistical safety stock with disruption risk buffer
    base_ss = 1.645 * math.sqrt(lead_time * (demand_uncertainty**2) + (daily_demand**2) * (lead_time_var**2))
    disruption_multiplier = 1.0 + (request.disruption_probability * 0.6)
    safety_stock = round(base_ss * disruption_multiplier, 2)

    # Dynamic Reorder Point
    lead_time_demand = daily_demand * lead_time
    reorder_point = round(lead_time_demand + safety_stock, 2)

    # Material requirement & availability
    material_requirement = round(request.forecasted_demand, 2)
    material_shortage = round(max(0.0, request.forecasted_demand - request.current_inventory), 2)
    material_availability = material_shortage == 0.0

    # Recommended Reorder Quantity (ROQ)
    if request.current_inventory <= reorder_point:
        reorder_qty = round(max(reorder_point - request.current_inventory + safety_stock, request.forecasted_demand * 0.5), 2)
        recommendation = f"Place reorder of {reorder_qty:.0f} units to maintain safety buffer against disruption risk ({request.disruption_probability * 100:.0f}%)."
    else:
        reorder_qty = 0.0
        recommendation = "Current inventory level is optimal. No immediate reorder required."

    return [
        InventoryPolicySchema(
            product_id=request.product_id,
            order_date=request.order_date,
            forecasted_demand=round(request.forecasted_demand, 2),
            inventory_before_demand=round(request.current_inventory, 2),
            inventory_position=round(request.current_inventory, 2),
            selected_lead_time=lead_time,
            selected_reorder_point=reorder_point,
            selected_reorder_quantity=reorder_qty,
            safety_stock=safety_stock,
            material_requirement=material_requirement,
            material_shortage=material_shortage,
            material_availability_flag=material_availability,
            reorder_recommendation=recommendation,
        )
    ]


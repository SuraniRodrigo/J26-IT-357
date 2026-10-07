from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from app.ml.inventory.backorder_model import BackorderRiskModel
from app.ml.inventory.policy_engine import PolicyEngine, PolicyType
from app.ml.inventory.risk_adjustment import (
    DisruptionScenario,
    evaluate_risk_profile,
)


@dataclass(frozen=True)
class OptimizationResult:
    product_id: str
    decision_date: date
    forecasted_demand: float
    current_inventory: float
    inventory_position: float
    in_transit_qty: float
    disruption_probability: float
    supplier_trust_score: float

    # Core calculated metrics (Items 1-5)
    risk_adjusted_lead_time: float
    forecast_lead_time_demand: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float

    # Operational deliverables (Items 6-8)
    material_requirement: float
    material_shortage: float
    material_availability_flag: bool

    # Risk & decision directives (Items 9-10)
    risk_level: str
    risk_factor: float
    reorder_recommendation: str
    reorder_required: bool

    # Model / Policy Metadata
    backorder_risk: float
    went_on_backorder_pred: bool
    policy_type: PolicyType
    disruption_scenario: DisruptionScenario
    policy_version: str = "inventory-policy-v1.0"
    backorder_model_version: str = "backorder-xgb-v1.0"
    upstream_source: str = "DEMO (Mock Upstream Provider)"


class InventoryOptimizer:
    """
    Deterministic Core Inventory Optimization Engine.
    Executes the 10-step optimization pipeline specified in Section 13.
    """

    def __init__(self) -> None:
        self.policy_engine = PolicyEngine()
        self.backorder_model = BackorderRiskModel()

    def optimize(
        self,
        product_id: str,
        current_inventory: float,
        forecasted_demand: float,
        average_lead_time: float = 3.5,
        lead_time_std_dev: float = 1.62,
        demand_std_dev: float = 38.87,
        disruption_probability: float = 0.0,
        supplier_trust_score: float = 75.0,
        in_transit_qty: float = 0.0,
        inventory_position: float | None = None,
        service_level: float = 0.95,
        z_value: float = 1.645,
        replenishment_cycle_days: int = 7,
        scenario: DisruptionScenario = "NORMAL",
        policy_type: PolicyType = "FORECAST_RISK_AWARE",
        decision_date: date | None = None,
        upstream_source: str = "DEMO (Mock Upstream Provider)",
        custom_features: dict[str, float] | None = None,
    ) -> OptimizationResult:
        """
        Executes deterministic optimization pipeline:
          1. Risk-adjusted lead time
          2. Forecast lead-time demand
          3. Risk-adjusted safety stock
          4. Risk-adjusted reorder point
          5. Risk-adjusted reorder quantity
          6. Material requirement
          7. Material shortage
          8. Material availability
          9. Inventory risk level
          10. Reorder recommendation
        """
        if current_inventory < 0:
            raise ValueError(f"Current inventory cannot be negative ({current_inventory}).")
        if forecasted_demand < 0:
            raise ValueError(f"Forecasted demand cannot be negative ({forecasted_demand}).")

        calc_date = decision_date or date.today()
        pos = current_inventory + in_transit_qty if inventory_position is None else inventory_position

        # Step 1-5: Calculate Policy Parameters using PolicyEngine
        policy_res = self.policy_engine.compute_full_policy(
            forecasted_demand=forecasted_demand,
            average_lead_time=average_lead_time,
            demand_std_dev=demand_std_dev,
            lead_time_std_dev=lead_time_std_dev,
            disruption_probability=disruption_probability,
            service_level=service_level,
            z_value=z_value,
            replenishment_cycle_days=replenishment_cycle_days,
            policy_type=policy_type,
        )

        # Step 6: Material Requirement (Section 17)
        material_requirement = round(forecasted_demand, 2)

        # Step 7: Material Shortage
        material_shortage = round(max(0.0, forecasted_demand - current_inventory), 2)

        # Step 8: Material Availability Flag
        material_availability_flag = bool(material_shortage == 0.0)

        # Auxiliary ML Backorder Signal (Section 19)
        bo_result = self.backorder_model.predict_backorder_risk(
            product_id=product_id,
            current_inventory=current_inventory,
            lead_time=policy_res.risk_adjusted_lead_time,
            in_transit_qty=in_transit_qty,
            forecasted_demand=forecasted_demand,
            custom_features=custom_features,
        )

        # Step 9: Inventory Risk Level Evaluation (Section 10 & 18)
        risk_profile = evaluate_risk_profile(
            disruption_probability=disruption_probability,
            scenario=scenario,
            material_shortage=material_shortage,
            current_inventory=current_inventory,
            safety_stock=policy_res.safety_stock,
            backorder_risk=bo_result.backorder_probability,
        )

        # Step 10: Reorder Recommendation & Decision Logic (Section 37)
        reorder_required = pos <= policy_res.reorder_point

        if material_shortage > 0:
            recom = (
                f"CRITICAL SHORTAGE: Deficit of {material_shortage:.1f} units detected. "
                f"Immediately dispatch priority order of {policy_res.reorder_quantity:.0f} units to prevent line halt."
            )
        elif pos < policy_res.safety_stock:
            recom = (
                f"BUFFER BREACH: Inventory position ({pos:.1f}) is below Safety Stock ({policy_res.safety_stock:.1f}). "
                f"Reorder {policy_res.reorder_quantity:.0f} units to absorb disruption risk ({disruption_probability * 100:.0f}%)."
            )
        elif pos <= policy_res.reorder_point:
            recom = (
                f"REORDER TRIGGERED: Inventory position ({pos:.1f}) reached Reorder Point ({policy_res.reorder_point:.1f}). "
                f"Place order of {policy_res.reorder_quantity:.0f} units for {replenishment_cycle_days}-day replenishment cycle."
            )
        elif bo_result.went_on_backorder_pred:
            recom = (
                f"ELEVATED BACKORDER RISK ({bo_result.backorder_probability * 100:.1f}%): "
                f"Monitor incoming shipments ({in_transit_qty:.0f} in transit). Stock currently adequate."
            )
        else:
            recom = (
                f"INVENTORY HEALTHY: On-hand position ({pos:.1f}) exceeds ROP ({policy_res.reorder_point:.1f}). "
                f"Coverage is secure against {scenario.lower()} disruption scenario."
            )

        return OptimizationResult(
            product_id=product_id,
            decision_date=calc_date,
            forecasted_demand=round(forecasted_demand, 2),
            current_inventory=round(current_inventory, 2),
            inventory_position=round(pos, 2),
            in_transit_qty=round(in_transit_qty, 2),
            disruption_probability=round(disruption_probability, 4),
            supplier_trust_score=round(supplier_trust_score, 1),
            risk_adjusted_lead_time=policy_res.risk_adjusted_lead_time,
            forecast_lead_time_demand=policy_res.forecast_lead_time_demand,
            safety_stock=policy_res.safety_stock,
            reorder_point=policy_res.reorder_point,
            reorder_quantity=policy_res.reorder_quantity,
            material_requirement=material_requirement,
            material_shortage=material_shortage,
            material_availability_flag=material_availability_flag,
            risk_level=risk_profile.risk_level,
            risk_factor=risk_profile.risk_factor,
            reorder_recommendation=recom,
            reorder_required=reorder_required,
            backorder_risk=bo_result.backorder_probability,
            went_on_backorder_pred=bo_result.went_on_backorder_pred,
            policy_type=policy_type,
            disruption_scenario=scenario,
            policy_version="inventory-policy-v1.0",
            backorder_model_version=bo_result.model_version,
            upstream_source=upstream_source,
        )

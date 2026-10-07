from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.ml.inventory.inventory_optimizer import InventoryOptimizer
from app.ml.inventory.risk_adjustment import DisruptionScenario


@dataclass(frozen=True)
class ScenarioComparisonEntry:
    scenario: DisruptionScenario
    multiplier: float
    disruption_probability: float
    risk_factor: float
    risk_adjusted_lead_time: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float
    material_shortage: float
    material_availability_flag: bool
    risk_level: str
    reorder_recommendation: str


@dataclass(frozen=True)
class MultiScenarioSimulationResult:
    product_id: str
    forecasted_demand: float
    current_inventory: float
    scenarios: dict[str, ScenarioComparisonEntry]


class InventorySimulator:
    """
    Simulates inventory policies across disruption scenarios (Normal, Moderate, Severe).
    """

    def __init__(self) -> None:
        self.optimizer = InventoryOptimizer()

    def run_scenario_analysis(
        self,
        product_id: str,
        current_inventory: float,
        forecasted_demand: float,
        average_lead_time: float = 3.5,
        lead_time_std_dev: float = 1.62,
        demand_std_dev: float = 38.87,
        base_disruption_prob: float = 0.35,
        supplier_trust_score: float = 75.0,
        in_transit_qty: float = 0.0,
        service_level: float = 0.95,
        z_value: float = 1.645,
        replenishment_cycle_days: int = 7,
    ) -> MultiScenarioSimulationResult:
        """Runs the optimization engine across NORMAL, MODERATE, and SEVERE disruption scenarios."""
        scenarios_config: list[tuple[DisruptionScenario, float]] = [
            ("NORMAL", 1.0),
            ("MODERATE", 1.5),
            ("SEVERE", 2.0),
        ]

        results: dict[str, ScenarioComparisonEntry] = {}

        for sc_name, sc_mult in scenarios_config:
            # Scale disruption probability according to scenario multiplier
            sc_prob = min(1.0, base_disruption_prob * (sc_mult / 1.0) if sc_name != "NORMAL" else base_disruption_prob)

            opt = self.optimizer.optimize(
                product_id=product_id,
                current_inventory=current_inventory,
                forecasted_demand=forecasted_demand,
                average_lead_time=average_lead_time,
                lead_time_std_dev=lead_time_std_dev,
                demand_std_dev=demand_std_dev,
                disruption_probability=sc_prob,
                supplier_trust_score=supplier_trust_score,
                in_transit_qty=in_transit_qty,
                service_level=service_level,
                z_value=z_value,
                replenishment_cycle_days=replenishment_cycle_days,
                scenario=sc_name,
            )

            results[sc_name] = ScenarioComparisonEntry(
                scenario=sc_name,
                multiplier=sc_mult,
                disruption_probability=round(sc_prob, 4),
                risk_factor=opt.risk_factor,
                risk_adjusted_lead_time=opt.risk_adjusted_lead_time,
                safety_stock=opt.safety_stock,
                reorder_point=opt.reorder_point,
                reorder_quantity=opt.reorder_quantity,
                material_shortage=opt.material_shortage,
                material_availability_flag=opt.material_availability_flag,
                risk_level=opt.risk_level,
                reorder_recommendation=opt.reorder_recommendation,
            )

        return MultiScenarioSimulationResult(
            product_id=product_id,
            forecasted_demand=forecasted_demand,
            current_inventory=current_inventory,
            scenarios=results,
        )

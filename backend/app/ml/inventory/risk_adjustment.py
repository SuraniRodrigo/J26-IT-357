from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
DisruptionScenario = Literal["NORMAL", "MODERATE", "SEVERE"]

# Scenario multipliers as defined in research specifications (Section 6 & 10)
SCENARIO_MULTIPLIERS: dict[DisruptionScenario, float] = {
    "NORMAL": 1.0,
    "MODERATE": 1.5,
    "SEVERE": 2.0,
}


@dataclass(frozen=True)
class RiskAdjustmentResult:
    disruption_probability: float
    risk_factor: float
    risk_level: RiskLevel
    disruption_scenario: DisruptionScenario
    is_critical_risk: bool
    explanation: str


def compute_risk_factor(disruption_probability: float, scenario: DisruptionScenario = "NORMAL") -> float:
    """
    Computes the risk factor mapping:
      Disruption Probability 0.00 -> 1.00
      Disruption Probability 0.25 -> 1.25
      Disruption Probability 0.50 -> 1.50
      Disruption Probability 0.75 -> 1.75
      Disruption Probability 1.00 -> 2.00
    Scaled by the scenario multiplier (Normal=1.0, Moderate=1.5, Severe=2.0).
    """
    prob_clamped = max(0.0, min(1.0, float(disruption_probability)))
    base_factor = 1.0 + prob_clamped
    multiplier = SCENARIO_MULTIPLIERS.get(scenario, 1.0)
    return round(base_factor * multiplier, 4)


def classify_inventory_risk_level(
    disruption_probability: float,
    material_shortage: float = 0.0,
    current_inventory: float = 0.0,
    safety_stock: float = 0.0,
    backorder_risk: float = 0.0,
) -> RiskLevel:
    """
    Configurable composite risk classification based on operational indicators:
    - CRITICAL: Active shortage OR stock below safety stock with high disruption risk OR backorder risk > 0.85
    - HIGH: Disruption probability >= 0.60 OR current stock < safety stock
    - MEDIUM: Disruption probability between 0.25 and 0.60
    - LOW: Disruption probability < 0.25 with healthy inventory position
    """
    if material_shortage > 0 or (current_inventory < safety_stock and disruption_probability >= 0.7) or backorder_risk > 0.85:
        return "CRITICAL"
    if disruption_probability >= 0.60 or current_inventory < safety_stock:
        return "HIGH"
    if disruption_probability >= 0.25:
        return "MEDIUM"
    return "LOW"


def evaluate_risk_profile(
    disruption_probability: float,
    scenario: DisruptionScenario = "NORMAL",
    material_shortage: float = 0.0,
    current_inventory: float = 0.0,
    safety_stock: float = 0.0,
    backorder_risk: float = 0.0,
) -> RiskAdjustmentResult:
    """Encapsulates full risk adjustment and returns structured result."""
    factor = compute_risk_factor(disruption_probability, scenario)
    level = classify_inventory_risk_level(
        disruption_probability=disruption_probability,
        material_shortage=material_shortage,
        current_inventory=current_inventory,
        safety_stock=safety_stock,
        backorder_risk=backorder_risk,
    )

    explanation = (
        f"Disruption prob {disruption_probability * 100:.1f}% mapped to risk factor {factor:.2f} "
        f"under {scenario} scenario resulting in {level} risk level."
    )

    return RiskAdjustmentResult(
        disruption_probability=disruption_probability,
        risk_factor=factor,
        risk_level=level,
        disruption_scenario=scenario,
        is_critical_risk=level in ("HIGH", "CRITICAL"),
        explanation=explanation,
    )

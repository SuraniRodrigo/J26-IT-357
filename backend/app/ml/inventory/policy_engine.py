from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

PolicyType = Literal["FORECAST_RISK_AWARE", "ADAPTIVE", "STATIC_BASELINE"]


@dataclass(frozen=True)
class PolicyComputationResult:
    policy_type: PolicyType
    risk_adjusted_lead_time: float
    forecast_lead_time_demand: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float
    service_level: float
    z_value: float
    replenishment_cycle_days: int


class PolicyEngine:
    """
    Configurable Inventory Policy Engine.
    Implements exact mathematical formulas established in research:
      - Risk_Adjusted_Lead_Time = Average_Lead_Time * (1 + Disruption_Probability)
      - Forecast_Lead_Time_Demand = Forecasted_Demand * Risk_Adjusted_Lead_Time
      - Risk_Adjusted_Safety_Stock = Z * sqrt(Risk_Adjusted_Lead_Time * Demand_Std_Dev^2 + Forecasted_Demand^2 * Lead_Time_Std_Dev^2)
      - Forecast_Risk_Aware_Reorder_Point = Forecast_Lead_Time_Demand + Risk_Adjusted_Safety_Stock
      - Forecast_Risk_Aware_Reorder_Quantity = Forecasted_Demand * Replenishment_Cycle_Days * (1 + Disruption_Probability)
    """

    @staticmethod
    def compute_risk_adjusted_lead_time(average_lead_time: float, disruption_probability: float) -> float:
        """Risk_Adjusted_Lead_Time = Average_Lead_Time * (1 + Disruption_Probability)"""
        prob = max(0.0, min(1.0, float(disruption_probability)))
        return round(float(average_lead_time) * (1.0 + prob), 4)

    @staticmethod
    def compute_forecast_lead_time_demand(forecasted_demand: float, risk_adjusted_lead_time: float) -> float:
        """Forecast_Lead_Time_Demand = Forecasted_Demand * Risk_Adjusted_Lead_Time"""
        return round(float(forecasted_demand) * float(risk_adjusted_lead_time), 4)

    @staticmethod
    def compute_risk_adjusted_safety_stock(
        z_value: float,
        risk_adjusted_lead_time: float,
        demand_std_dev: float,
        forecasted_demand: float,
        lead_time_std_dev: float,
    ) -> float:
        """
        Risk_Adjusted_Safety_Stock = Z * sqrt(
            Risk_Adjusted_Lead_Time * Demand_Std_Dev^2 + Forecasted_Demand^2 * Lead_Time_Std_Dev^2
        )
        """
        lt = max(0.0001, float(risk_adjusted_lead_time))
        d_std = max(0.0, float(demand_std_dev))
        f_demand = max(0.0, float(forecasted_demand))
        lt_std = max(0.0, float(lead_time_std_dev))

        variance_term = (lt * (d_std**2)) + ((f_demand**2) * (lt_std**2))
        safety_stock = float(z_value) * math.sqrt(max(0.0, variance_term))
        return round(safety_stock, 4)

    @staticmethod
    def compute_reorder_point(forecast_lead_time_demand: float, risk_adjusted_safety_stock: float) -> float:
        """Forecast_Risk_Aware_Reorder_Point = Forecast_Lead_Time_Demand + Risk_Adjusted_Safety_Stock"""
        return round(float(forecast_lead_time_demand) + float(risk_adjusted_safety_stock), 4)

    @staticmethod
    def compute_reorder_quantity(
        forecasted_demand: float,
        replenishment_cycle_days: int = 7,
        disruption_probability: float = 0.0,
    ) -> float:
        """Forecast_Risk_Aware_Reorder_Quantity = Forecasted_Demand * Replenishment_Cycle_Days * (1 + Disruption_Probability)"""
        prob = max(0.0, min(1.0, float(disruption_probability)))
        cycle = max(1, int(replenishment_cycle_days))
        return round(float(forecasted_demand) * cycle * (1.0 + prob), 4)

    @classmethod
    def compute_full_policy(
        cls,
        forecasted_demand: float,
        average_lead_time: float,
        demand_std_dev: float,
        lead_time_std_dev: float,
        disruption_probability: float = 0.0,
        service_level: float = 0.95,
        z_value: float = 1.645,
        replenishment_cycle_days: int = 7,
        policy_type: PolicyType = "FORECAST_RISK_AWARE",
    ) -> PolicyComputationResult:
        """Calculates the complete policy metrics deterministically."""
        if policy_type == "STATIC_BASELINE":
            # Static baseline ignores disruption probability
            risk_adj_lt = float(average_lead_time)
            lt_demand = float(forecasted_demand) * risk_adj_lt
            ss = float(z_value) * math.sqrt(
                (risk_adj_lt * (demand_std_dev**2)) + ((forecasted_demand**2) * (lead_time_std_dev**2))
            )
            rop = lt_demand + ss
            roq = float(forecasted_demand) * float(replenishment_cycle_days)
        else:
            # FORECAST_RISK_AWARE / ADAPTIVE
            risk_adj_lt = cls.compute_risk_adjusted_lead_time(average_lead_time, disruption_probability)
            lt_demand = cls.compute_forecast_lead_time_demand(forecasted_demand, risk_adj_lt)
            ss = cls.compute_risk_adjusted_safety_stock(
                z_value=z_value,
                risk_adjusted_lead_time=risk_adj_lt,
                demand_std_dev=demand_std_dev,
                forecasted_demand=forecasted_demand,
                lead_time_std_dev=lead_time_std_dev,
            )
            rop = cls.compute_reorder_point(lt_demand, ss)
            roq = cls.compute_reorder_quantity(
                forecasted_demand=forecasted_demand,
                replenishment_cycle_days=replenishment_cycle_days,
                disruption_probability=disruption_probability,
            )

        return PolicyComputationResult(
            policy_type=policy_type,
            risk_adjusted_lead_time=round(risk_adj_lt, 2),
            forecast_lead_time_demand=round(lt_demand, 2),
            safety_stock=round(ss, 2),
            reorder_point=round(rop, 2),
            reorder_quantity=round(roq, 2),
            service_level=service_level,
            z_value=z_value,
            replenishment_cycle_days=replenishment_cycle_days,
        )

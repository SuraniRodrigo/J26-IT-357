from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger("optichain.inventory.backorder")

ARTIFACTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "models_artifacts", "inventory")
)
MODEL_FILENAME = "OptiChain_Backorder_XGBoost_Model.joblib"

MODEL_FEATURES = [
    "national_inv",
    "lead_time",
    "in_transit_qty",
    "forecast_3_month",
    "forecast_6_month",
    "forecast_9_month",
    "sales_1_month",
    "sales_3_month",
    "sales_6_month",
    "sales_9_month",
    "min_bank",
    "potential_issue",
    "pieces_past_due",
    "perf_6_month_avg",
    "perf_12_month_avg",
    "local_bo_qty",
    "deck_risk",
    "oe_constraint",
    "ppap_risk",
    "stop_auto_buy",
    "rev_stop",
    "demand_3m_avg",
    "sales_6m_avg",
    "sales_9m_avg",
    "inventory_demand_ratio",
    "total_available_supply",
    "supply_gap_3m",
    "forecast_to_inventory_ratio",
    "sales_trend_3m_9m",
    "forecast_growth_3m_6m",
    "forecast_growth_6m_9m",
    "inventory_vs_min_bank",
    "past_due_ratio",
    "local_backorder_pressure",
    "lead_time_demand_pressure",
]

# Evaluation metrics established in research (Section 19 & 40)
BACKORDER_MODEL_METRICS = {
    "model_name": "OptiChain_Backorder_XGBoost",
    "model_version": "backorder-xgb-v1.0",
    "threshold": 0.90,
    "roc_auc": 0.9059,
    "pr_auc": 0.1797,
    "f1": 0.2269,
    "precision": 0.3159,
    "recall": 0.1771,
    "accuracy": 0.9866,
    "role": "Auxiliary ML Risk Signal (Benchmark Dataset)",
}


@dataclass(frozen=True)
class BackorderPredictionResult:
    product_id: str
    backorder_probability: float
    went_on_backorder_pred: bool
    threshold_applied: float
    model_version: str
    is_auxiliary_signal: bool
    model_metrics: dict[str, Any]


class BackorderRiskModel:
    """
    Adapter for the trained XGBoost Backorder Classifier.
    Serves as an auxiliary risk signal to alert when inventory state poses high backorder probability.
    """

    _instance: BackorderRiskModel | None = None
    _model: Any = None

    def __new__(cls) -> BackorderRiskModel:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self) -> None:
        model_path = os.path.join(ARTIFACTS_DIR, MODEL_FILENAME)
        if os.path.exists(model_path):
            try:
                self._model = joblib.load(model_path)
                logger.info(f"Loaded Backorder XGBoost model from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load XGBoost joblib model: {e}. Using statistical heuristic fallback.")
                self._model = None
        else:
            logger.warning(f"Model file not found at {model_path}. Using statistical fallback.")
            self._model = None

    def _construct_features(
        self,
        current_inventory: float,
        lead_time: float,
        in_transit_qty: float,
        forecasted_demand: float,
        custom_features: dict[str, float] | None = None,
    ) -> pd.DataFrame:
        """
        Maps available inventory signals into the 35 expected XGBoost feature columns.
        Derives engineered ratios and uses domain-appropriate defaults for missing telemetry.
        """
        feats: dict[str, float] = {}

        # Core inventory signals
        inv = max(0.0, float(current_inventory))
        lt = max(1.0, float(lead_time))
        transit = max(0.0, float(in_transit_qty))
        f_monthly = max(0.0, float(forecasted_demand) * 2.0)  # estimate monthly rate

        feats["national_inv"] = inv
        feats["lead_time"] = lt
        feats["in_transit_qty"] = transit
        feats["forecast_3_month"] = f_monthly * 3.0
        feats["forecast_6_month"] = f_monthly * 6.0
        feats["forecast_9_month"] = f_monthly * 9.0
        feats["sales_1_month"] = f_monthly
        feats["sales_3_month"] = f_monthly * 3.0
        feats["sales_6_month"] = f_monthly * 6.0
        feats["sales_9_month"] = f_monthly * 9.0
        feats["min_bank"] = max(10.0, f_monthly * 0.25)
        feats["potential_issue"] = 0.0
        feats["pieces_past_due"] = 0.0
        feats["perf_6_month_avg"] = 0.88
        feats["perf_12_month_avg"] = 0.90
        feats["local_bo_qty"] = 0.0
        feats["deck_risk"] = 0.0
        feats["oe_constraint"] = 0.0
        feats["ppap_risk"] = 0.0
        feats["stop_auto_buy"] = 0.0
        feats["rev_stop"] = 0.0

        # Engineered features
        demand_3m = max(1.0, feats["forecast_3_month"])
        feats["demand_3m_avg"] = demand_3m / 3.0
        feats["sales_6m_avg"] = feats["sales_6_month"] / 6.0
        feats["sales_9m_avg"] = feats["sales_9_month"] / 9.0
        feats["inventory_demand_ratio"] = inv / demand_3m
        feats["total_available_supply"] = inv + transit
        feats["supply_gap_3m"] = demand_3m - feats["total_available_supply"]
        feats["forecast_to_inventory_ratio"] = demand_3m / (inv + 1.0)
        feats["sales_trend_3m_9m"] = feats["sales_3_month"] / (feats["sales_9_month"] + 1.0)
        feats["forecast_growth_3m_6m"] = feats["forecast_6_month"] / (demand_3m + 1.0)
        feats["forecast_growth_6m_9m"] = feats["forecast_9_month"] / (feats["forecast_6_month"] + 1.0)
        feats["inventory_vs_min_bank"] = inv / feats["min_bank"]
        feats["past_due_ratio"] = 0.0
        feats["local_backorder_pressure"] = 0.0
        feats["lead_time_demand_pressure"] = (lt * (f_monthly / 30.0)) / (inv + 1.0)

        # Merge any user-provided custom features
        if custom_features:
            for k, v in custom_features.items():
                if k in MODEL_FEATURES:
                    feats[k] = float(v)

        return pd.DataFrame([[feats[col] for col in MODEL_FEATURES]], columns=MODEL_FEATURES)

    def predict_backorder_risk(
        self,
        product_id: str,
        current_inventory: float,
        lead_time: float,
        in_transit_qty: float = 0.0,
        forecasted_demand: float = 100.0,
        custom_features: dict[str, float] | None = None,
    ) -> BackorderPredictionResult:
        """
        Infers backorder probability using the loaded XGBoost model.
        Falls back to a robust structural calculation if the ML binary is unavailable.
        """
        threshold = BACKORDER_MODEL_METRICS["threshold"]

        if self._model is not None:
            try:
                df = self._construct_features(
                    current_inventory=current_inventory,
                    lead_time=lead_time,
                    in_transit_qty=in_transit_qty,
                    forecasted_demand=forecasted_demand,
                    custom_features=custom_features,
                )
                probs = self._model.predict_proba(df)
                prob_backorder = float(probs[0][1])
                pred_label = bool(prob_backorder >= threshold)
            except Exception as e:
                logger.error(f"XGBoost inference failed: {e}. Using structural fallback.")
                prob_backorder = self._calculate_heuristic_risk(current_inventory, forecasted_demand, lead_time)
                pred_label = bool(prob_backorder >= threshold)
        else:
            prob_backorder = self._calculate_heuristic_risk(current_inventory, forecasted_demand, lead_time)
            pred_label = bool(prob_backorder >= threshold)

        return BackorderPredictionResult(
            product_id=product_id,
            backorder_probability=round(prob_backorder, 4),
            went_on_backorder_pred=pred_label,
            threshold_applied=threshold,
            model_version=BACKORDER_MODEL_METRICS["model_version"],
            is_auxiliary_signal=True,
            model_metrics=BACKORDER_MODEL_METRICS,
        )

    @staticmethod
    def _calculate_heuristic_risk(current_inventory: float, forecasted_demand: float, lead_time: float) -> float:
        """Fallback backorder pressure when model is uninitialized."""
        expected_demand = (forecasted_demand / 14.0) * lead_time
        if current_inventory <= 0:
            return 0.95
        ratio = current_inventory / max(1.0, expected_demand)
        if ratio < 0.5:
            return 0.92
        elif ratio < 1.0:
            return 0.65
        elif ratio < 1.5:
            return 0.35
        return 0.08

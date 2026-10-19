from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any
import joblib
import numpy as np

from app.ml.demand.hierarchical_mint import HierarchicalReconciler, ReconciliationMethod
from app.repositories.demand_repository import DemandRepository
from app.schemas.demand import DemandForecastSchema


class DemandModelService:
    """
    Production inference service wrapping the trained M5 Hierarchical MinT artifact
    integrated with real DataCo Supply Chain and M5 CSV historical datasets.
    Zero fabricated sine waves or hardcoded mock fallbacks.
    """

    _instance: DemandModelService | None = None

    def __init__(self, artifact_path: str | None = None):
        self.artifact_path = artifact_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "models_artifacts",
            "demand",
            "m5_mint_artifact.joblib",
        )
        self.artifact: dict[str, Any] | None = None
        self.repo = DemandRepository.get_instance()
        self._load_artifact()

    @classmethod
    def get_instance(cls) -> DemandModelService:
        if cls._instance is None:
            cls._instance = DemandModelService()
        return cls._instance

    def _load_artifact(self) -> None:
        if os.path.exists(self.artifact_path):
            try:
                self.artifact = joblib.load(self.artifact_path)
            except Exception as e:
                print(f"Warning: Failed to load demand artifact at {self.artifact_path}: {e}")
                self.artifact = None
        else:
            self.artifact = None

    @property
    def is_loaded(self) -> bool:
        return self.artifact is not None

    def get_canonical_node(self, query: str) -> str:
        """
        Resolves query to canonical node in the hierarchical model or returns the product identifier.
        """
        if not self.artifact:
            return query

        node_names = self.artifact.get("node_names", [])
        aliases = self.artifact.get("garment_aliases", {})

        # Direct match in model node names
        if query in node_names:
            return query

        # Exact alias match
        if query in aliases:
            return aliases[query]

        # Case-insensitive alias match
        q_lower = query.strip().lower()
        for alias, target in aliases.items():
            if alias.lower() == q_lower:
                return target

        # Substring search in aliases
        for alias, target in aliases.items():
            if q_lower in alias.lower() or alias.lower() in q_lower:
                return target

        # Check if query matches node names case-insensitively
        for n in node_names:
            if n.lower() == q_lower:
                return n

        # If not found in artifact, return original query to be resolved via real CSV repository
        return query

    def forecast(
        self,
        product_id: str,
        horizon_days: int = 30,
        model_version: str | None = None,
        data_source: str | None = "auto",
    ) -> list[DemandForecastSchema]:
        """
        Generate mathematically coherent hierarchical forecast or empirical statistical forecast
        derived directly from real CSV data.
        """
        if horizon_days < 1:
            raise ValueError("Forecast horizon must be positive.")

        # Determine reconciliation method from model_version string (e.g. "Hierarchical-MinT-LK-v2.4 (BU)")
        method: ReconciliationMethod = "MinT"
        if model_version:
            v_upper = model_version.upper()
            if "BU" in v_upper or "BOTTOM-UP" in v_upper:
                method = "BU"
            elif "TD" in v_upper or "TOP-DOWN" in v_upper:
                method = "TD"
            elif "MO" in v_upper or "MIDDLE-OUT" in v_upper:
                method = "MO"
            elif "OLS" in v_upper:
                method = "OLS"
            elif "MINT" in v_upper:
                method = "MinT"

        active_version = model_version or f"Hierarchical-MinT-LK-v2.4 ({method})"

        # Check if query should be handled by the hierarchical model or the real DataCo CSV
        canonical_node = self.get_canonical_node(product_id)

        # Check if canonical node exists in the trained hierarchical artifact
        has_reconciler_node = (
            self.artifact is not None
            and "reconciler" in self.artifact
            and canonical_node in self.artifact["reconciler"].node_to_idx
        )

        # If explicit DataCo requested or canonical node not in reconciler, use real CSV empirical engine
        if (data_source and data_source.lower() == "dataco") or not has_reconciler_node:
            empirical_records = self.repo.get_empirical_forecast(
                identifier=product_id,
                horizon_days=horizon_days,
                model_version=active_version,
            )
            return [
                DemandForecastSchema(
                    product_id=rec["product_id"],
                    forecast_date=rec["forecast_date"],
                    forecasted_demand=rec["forecasted_demand"],
                    forecast_horizon=rec["forecast_horizon"],
                    model_version=rec["model_version"],
                    lower_bound=rec.get("lower_bound"),
                    upper_bound=rec.get("upper_bound"),
                    data_source=rec.get("data_source"),
                )
                for rec in empirical_records
            ]

        # ---------------------------------------------------------------------
        # Hierarchical Reconciled Forecast via trained M5 MinT engine
        # ---------------------------------------------------------------------
        reconciler: HierarchicalReconciler = self.artifact["reconciler"]
        forecasters = self.artifact["forecasters"]
        T_hist = self.artifact["T_hist"]
        m = self.artifact["m"]

        # 1. Base forecasts for all m nodes
        base_forecasts = np.zeros((m, horizon_days))
        for i in range(m):
            base_forecasts[i, :] = forecasters[i].predict_horizon(T_hist, horizon_days)

        # 2. Reconcile
        reconciled = reconciler.reconcile(base_forecasts, method=method)

        # 3. Resolve target node series
        node_idx = reconciler.node_to_idx.get(canonical_node, 0)
        node_series = reconciled[node_idx, :]

        # Standard deviation for prediction intervals
        std_val = float(max(1.0, np.std(node_series) * 0.12))

        # 4. Construct response records
        base_date = date.today()
        records = []
        for step in range(horizon_days):
            forecast_date = base_date + timedelta(days=step + 1)
            val = float(round(node_series[step], 1))
            p10 = max(0.0, float(round(val - 1.28 * std_val, 1)))
            p90 = float(round(val + 1.28 * std_val, 1))

            records.append(
                DemandForecastSchema(
                    product_id=product_id,
                    forecast_date=forecast_date,
                    forecasted_demand=val,
                    forecast_horizon=horizon_days,
                    model_version=active_version,
                    lower_bound=p10,
                    upper_bound=p90,
                    data_source="m5_hierarchical_mint",
                )
            )

        return records

    def reconcile_hierarchy_all(
        self,
        horizon_days: int = 30,
        method: ReconciliationMethod = "MinT",
        buyer_surge_factor: float = 0.0,
    ) -> dict[str, Any]:
        """
        Executes hierarchical reconciliation across the full tree for the specified horizon and method.
        """
        if not self.artifact:
            return {"status": "unloaded", "message": "Model artifact not loaded."}

        reconciler: HierarchicalReconciler = self.artifact["reconciler"]
        forecasters = self.artifact["forecasters"]
        T_hist = self.artifact["T_hist"]
        m = self.artifact["m"]

        base_forecasts = np.zeros((m, horizon_days))
        for i in range(m):
            base_forecasts[i, :] = forecasters[i].predict_horizon(T_hist, horizon_days)

        # Apply surge factor if specified
        if buyer_surge_factor != 0.0:
            surge_mult = 1.0 + (buyer_surge_factor / 100.0)
            base_forecasts *= surge_mult

        reconciled = reconciler.reconcile(base_forecasts, method=method)
        coherence = reconciler.check_coherence(reconciled)

        node_results = []
        for name, idx in reconciler.node_to_idx.items():
            series = reconciled[idx, :].tolist()
            tot = float(round(sum(series), 1))
            node_results.append(
                {
                    "node_id": name,
                    "total_forecast": tot,
                    "daily_forecasts": [float(round(v, 1)) for v in series],
                }
            )

        root_total = float(round(reconciled[0, :].sum(), 1))
        bottom_sum = float(round(reconciled[-reconciler.k :, :].sum(), 1))

        return {
            "reconciliation_method": method,
            "forecast_horizon_days": horizon_days,
            "is_coherent": bool(coherence["is_coherent"]),
            "max_discrepancy": float(round(coherence["max_discrepancy"], 4)),
            "root_total_forecast": root_total,
            "sum_bottom_forecast": bottom_sum,
            "nodes": node_results,
            "data_source": "m5_hierarchical_mint",
        }

    def get_hierarchy_metadata(self) -> dict[str, Any]:
        """
        Returns full hierarchy metadata from the trained artifact and real CSV datasets.
        """
        summary = self.repo.get_datasets_summary()

        if not self.artifact:
            return {
                "status": "partial",
                "message": "Model artifact not loaded. Real CSV datasets active.",
                "datasets": summary,
            }

        return {
            "model_name": self.artifact.get("model_name"),
            "version": self.artifact.get("version"),
            "total_nodes_m": self.artifact["m"],
            "bottom_nodes_k": self.artifact["k"],
            "historical_days": self.artifact["T_hist"],
            "available_methods": ["MinT", "BU", "TD", "MO", "OLS"],
            "root_node": "TOTAL",
            "categories": [n for n in self.artifact["node_names"] if n in ["FOODS", "HOBBIES", "HOUSEHOLD"]],
            "departments": [
                n
                for n in self.artifact["node_names"]
                if "_" in n
                and not n.startswith("FOODS_1_")
                and not n.startswith("HOBBIES_1_")
                and not n.startswith("HOUSEHOLD_1_")
                and not n.startswith("FOODS_2_")
                and not n.startswith("FOODS_3_")
                and not n.startswith("HOBBIES_2_")
                and not n.startswith("HOUSEHOLD_2_")
                and len(n.split("_")) == 2
            ],
            "sample_bottom_skus": self.artifact["bottom_names"][:5],
            "real_datasets": summary,
        }

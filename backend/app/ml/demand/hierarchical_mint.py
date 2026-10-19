from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Literal
import numpy as np


ReconciliationMethod = Literal["MinT", "BU", "TD", "MO", "OLS"]


@dataclass
class HierarchyNode:
    name: str
    level: int
    parent: str | None
    children: list[str]


class HierarchicalReconciler:
    """
    Hierarchical Forecast Reconciliation Engine.
    Implements:
      - MinT (Minimum Trace optimal reconciliation using sample/shrinkage covariance)
      - Bottom-Up (BU)
      - Top-Down (TD) with average historical proportions
      - Middle-Out (MO)
      - Ordinary Least Squares (OLS)
    
    Mathematical Formulation:
      y_t = S * b_t
      where S is the (m x k) summing matrix, m = total series, k = bottom series.
      Reconciled forecasts: y_tilde = S * P * y_hat
      where P is the (k x m) projection matrix.
    """

    def __init__(
        self,
        node_names: list[str],
        bottom_node_names: list[str],
        summing_matrix: np.ndarray,
        historical_proportions: np.ndarray | None = None,
        middle_node_indices: list[int] | None = None,
    ):
        self.node_names = node_names
        self.bottom_node_names = bottom_node_names
        self.summing_matrix = np.array(summing_matrix, dtype=float)  # (m x k)
        self.m, self.k = self.summing_matrix.shape
        self.node_to_idx = {name: idx for idx, name in enumerate(node_names)}
        self.bottom_indices = [self.node_to_idx[name] for name in bottom_node_names]
        
        # Bottom-up projection matrix P_bu: (k x m)
        self.P_bu = np.zeros((self.k, self.m), dtype=float)
        for i, b_idx in enumerate(self.bottom_indices):
            self.P_bu[i, b_idx] = 1.0

        # Historical proportions for Top-Down (k,)
        if historical_proportions is not None:
            self.proportions = np.array(historical_proportions, dtype=float)
            if self.proportions.sum() > 0:
                self.proportions = self.proportions / self.proportions.sum()
        else:
            self.proportions = np.ones(self.k, dtype=float) / self.k

        self.middle_node_indices = middle_node_indices or []
        self._mint_P: np.ndarray | None = None
        self._ols_P: np.ndarray | None = None

    def fit_covariance(self, residuals: np.ndarray, shrinkage: float = 0.15) -> np.ndarray:
        """
        Fit error covariance matrix W from in-sample residuals (T x m).
        Applies Ledoit-Wolf-style shrinkage toward diagonal to guarantee
        positive definiteness and numerical invertibility.
        """
        # Residuals: (T x m)
        residuals = np.array(residuals, dtype=float)
        T, m = residuals.shape
        if m != self.m:
            raise ValueError(f"Residual column count {m} does not match hierarchy size {self.m}")

        # Empirical covariance
        sample_cov = np.cov(residuals, rowvar=False)
        if sample_cov.ndim == 0:
            sample_cov = np.array([[sample_cov]])

        # Diagonal target
        diag_target = np.diag(np.diag(sample_cov))

        # Regularized covariance W
        W = (1.0 - shrinkage) * sample_cov + shrinkage * diag_target
        # Add tiny jitter for numerical stability
        W += np.eye(self.m) * 1e-6

        # Compute MinT projection matrix: P = (S^T W^-1 S)^-1 S^T W^-1
        S = self.summing_matrix
        try:
            W_inv = np.linalg.inv(W)
            STS_inv = np.linalg.inv(S.T @ W_inv @ S)
            self._mint_P = STS_inv @ S.T @ W_inv
        except np.linalg.LinAlgError:
            # Fallback to pseudo-inverse if singular
            W_inv = np.linalg.pinv(W)
            self._mint_P = np.linalg.pinv(S.T @ W_inv @ S) @ S.T @ W_inv

        # Compute OLS projection matrix: P = (S^T S)^-1 S^T
        self._ols_P = np.linalg.inv(S.T @ S) @ S.T
        return W

    def reconcile(
        self,
        base_forecasts: np.ndarray,
        method: ReconciliationMethod = "MinT",
    ) -> np.ndarray:
        """
        Reconcile base forecasts y_hat (m x H) or (m,).
        Returns coherent reconciled forecasts y_tilde (m x H) or (m,).
        """
        is_1d = base_forecasts.ndim == 1
        y_hat = base_forecasts[:, np.newaxis] if is_1d else np.array(base_forecasts, dtype=float)
        m, H = y_hat.shape

        if m != self.m:
            raise ValueError(f"Base forecasts count ({m}) must match total nodes ({self.m})")

        S = self.summing_matrix

        if method == "MinT":
            P = self._mint_P if self._mint_P is not None else self.P_bu
            b_tilde = P @ y_hat
        elif method == "OLS":
            P = self._ols_P if self._ols_P is not None else np.linalg.pinv(S.T @ S) @ S.T
            b_tilde = P @ y_hat
        elif method == "BU":
            b_tilde = self.P_bu @ y_hat
        elif method == "TD":
            # Top-down: Disaggregate top level forecast using proportions
            top_forecast = y_hat[0:1, :]  # (1 x H)
            b_tilde = self.proportions[:, np.newaxis] * top_forecast
        elif method == "MO":
            # Middle-out: If middle nodes exist, aggregate them to top and disaggregate to bottom
            if self.middle_node_indices:
                mid_forecasts = y_hat[self.middle_node_indices, :].sum(axis=0, keepdims=True)
                b_tilde = self.proportions[:, np.newaxis] * mid_forecasts
            else:
                b_tilde = self.P_bu @ y_hat
        else:
            raise ValueError(f"Unsupported reconciliation method: {method}")

        # Non-negativity enforced at bottom level, guaranteeing exact coherence: y_tilde = S * b_tilde
        b_tilde = np.clip(b_tilde, a_min=0.0, a_max=None)
        y_tilde = S @ b_tilde

        return y_tilde[:, 0] if is_1d else y_tilde

    def check_coherence(self, reconciled_forecasts: np.ndarray) -> dict[str, Any]:
        """
        Verify that reconciled forecasts satisfy y = S * y_bottom.
        """
        is_1d = reconciled_forecasts.ndim == 1
        y = reconciled_forecasts[:, np.newaxis] if is_1d else reconciled_forecasts
        S = self.summing_matrix
        b = self.P_bu @ y
        reconstructed = S @ b
        
        abs_diff = np.abs(y - reconstructed)
        max_discrepancy = float(np.max(abs_diff))
        mean_discrepancy = float(np.mean(abs_diff))
        is_coherent = max_discrepancy < 1e-4

        return {
            "is_coherent": is_coherent,
            "max_discrepancy": max_discrepancy,
            "mean_discrepancy": mean_discrepancy,
            "coherence_percentage": 100.0 if is_coherent else max(0.0, 100.0 - (max_discrepancy * 10)),
        }


class BaseTSForecaster:
    """
    Fits trend, day-of-week seasonality, and monthly Fourier dynamics for a time-series node.
    """
    def __init__(self):
        from sklearn.linear_model import Ridge
        self.model = Ridge(alpha=1.0)
        self.mean_val = 0.0
        self.fitted_values: np.ndarray | None = None
        self.residuals: np.ndarray | None = None

    def fit(self, y: np.ndarray):
        T = len(y)
        self.mean_val = float(np.mean(y))
        
        # Features: Trend + Weekly Fourier features (period=7) + Monthly Fourier (period=30.4)
        t = np.arange(T)
        X = np.column_stack([
            t / T,
            np.sin(2 * np.pi * t / 7.0),
            np.cos(2 * np.pi * t / 7.0),
            np.sin(2 * np.pi * t / 30.4),
            np.cos(2 * np.pi * t / 30.4),
            np.sin(4 * np.pi * t / 7.0),
            np.cos(4 * np.pi * t / 7.0),
        ])
        
        self.model.fit(X, y)
        self.fitted_values = np.clip(self.model.predict(X), a_min=0.0, a_max=None)
        self.residuals = y - self.fitted_values

    def predict_horizon(self, T_hist: int, horizon: int) -> np.ndarray:
        t_future = np.arange(T_hist, T_hist + horizon)
        X_future = np.column_stack([
            t_future / T_hist,
            np.sin(2 * np.pi * t_future / 7.0),
            np.cos(2 * np.pi * t_future / 7.0),
            np.sin(2 * np.pi * t_future / 30.4),
            np.cos(2 * np.pi * t_future / 30.4),
            np.sin(4 * np.pi * t_future / 7.0),
            np.cos(4 * np.pi * t_future / 7.0),
        ])
        preds = self.model.predict(X_future)
        return np.clip(preds, a_min=0.0, a_max=None)


"""
M5 Hierarchical MinT Forecasting Pipeline & Model Trainer
=========================================================
This script:
  1. Loads M5 sales data (M5_Sales_DemandForecasting_Clean.csv) and calendar.csv
  2. Builds the multi-level time-series hierarchy:
       - Level 0: Consolidated Total (LK-APPAREL-CLUSTER-ALL)
       - Level 1: Categories / Facilities
       - Level 2: Departments / Buyer Silhouette Lines
       - Level 3: Individual Styles / SKUs
  3. Constructs the Summing Matrix S (m x k)
  4. Fits base time-series models (trend + weekly Fourier + monthly seasonality + lag)
  5. Computes in-sample residual covariance matrix W with shrinkage
  6. Computes optimal MinT projection matrix P_mint = (S^T W^-1 S)^-1 S^T W^-1
  7. Validates mathematical coherence (y_tilde = S * y_bottom)
  8. Exports production artifact to backend/models_artifacts/demand/m5_mint_artifact.joblib
"""

from __future__ import annotations

import csv
import os
import sys
from datetime import date, timedelta
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.ml.demand.hierarchical_mint import HierarchicalReconciler, BaseTSForecaster


def load_m5_data(sales_path: str, calendar_path: str, store_filter: str = "CA_1", top_n_items_per_dept: int = 5):
    print("Loading M5 sales dataset...")
    df_sales = pd.read_csv(sales_path)
    if store_filter:
        df_sales = df_sales[df_sales["store_id"] == store_filter].copy()

    # Get day columns
    day_cols = [c for c in df_sales.columns if c.startswith("d_")]
    print(f"Filtered store: {store_filter}, Total rows: {len(df_sales)}, Days: {len(day_cols)}")

    # Load calendar if available
    date_map = {}
    if os.path.exists(calendar_path):
        df_cal = pd.read_csv(calendar_path)
        date_map = dict(zip(df_cal["d"], df_cal["date"]))

    # Select representative items per department to build a robust, fast-training hierarchy
    selected_items = []
    for dept_id, group in df_sales.groupby("dept_id"):
        # Rank by total sales volume
        group = group.copy()
        group["total_sales"] = group[day_cols].sum(axis=1)
        top_items = group.sort_values(by="total_sales", ascending=False).head(top_n_items_per_dept)
        selected_items.append(top_items)
    
    df_bottom = pd.concat(selected_items, ignore_index=True)
    print(f"Selected {len(df_bottom)} bottom-level items across {df_bottom['dept_id'].nunique()} departments")
    return df_bottom, day_cols, date_map


def build_hierarchy(df_bottom: pd.DataFrame, day_cols: list[str]):
    """
    Builds the 4-level hierarchy:
      Level 0: TOTAL
      Level 1: Categories
      Level 2: Departments
      Level 3: Bottom Items
    """
    categories = sorted(df_bottom["cat_id"].unique())
    departments = sorted(df_bottom["dept_id"].unique())
    items = sorted(df_bottom["item_id"].unique())

    # Bottom series: (k x T)
    k = len(df_bottom)
    bottom_series = df_bottom[day_cols].values.astype(float)  # (k x T)
    T = len(day_cols)

    # Level 2 (Departments)
    dept_names = departments
    dept_series = []
    dept_to_bottom = {}
    for d in dept_names:
        mask = (df_bottom["dept_id"] == d).values
        dept_to_bottom[d] = np.where(mask)[0]
        dept_series.append(bottom_series[mask].sum(axis=0))
    dept_series = np.array(dept_series)  # (n_dept x T)

    # Level 1 (Categories)
    cat_names = categories
    cat_series = []
    cat_to_bottom = {}
    for c in cat_names:
        mask = (df_bottom["cat_id"] == c).values
        cat_to_bottom[c] = np.where(mask)[0]
        cat_series.append(bottom_series[mask].sum(axis=0))
    cat_series = np.array(cat_series)  # (n_cat x T)

    # Level 0 (Total)
    total_series = bottom_series.sum(axis=0, keepdims=True)  # (1 x T)

    # Combine all series vertically into y_all: (m x T)
    # Ordering: [TOTAL, Categories..., Departments..., BottomItems...]
    node_names = ["TOTAL"] + cat_names + dept_names + list(df_bottom["item_id"].values)
    all_series = np.vstack([total_series, cat_series, dept_series, bottom_series])
    m = len(node_names)
    print(f"Hierarchy built: {m} total series (1 Total + {len(cat_names)} Cats + {len(dept_names)} Depts + {k} Items)")

    # Build Summing Matrix S: (m x k)
    S = np.zeros((m, k), dtype=float)
    # Row 0: TOTAL is sum of all bottom series
    S[0, :] = 1.0

    # Category rows
    row_idx = 1
    for c in cat_names:
        S[row_idx, cat_to_bottom[c]] = 1.0
        row_idx += 1

    # Department rows
    for d in dept_names:
        S[row_idx, dept_to_bottom[d]] = 1.0
        row_idx += 1

    # Bottom rows: Identity matrix
    S[row_idx:, :] = np.eye(k)

    # Verify S @ bottom == all_series
    reconstructed = S @ bottom_series
    assert np.allclose(reconstructed, all_series), "Summing matrix S does not reconstruct aggregated series!"
    print("Summing matrix S successfully verified against ground-truth aggregated series.")

    return node_names, list(df_bottom["item_id"].values), S, all_series, dept_names





def train_hierarchical_mint(
    sales_path: str,
    calendar_path: str,
    artifact_output_path: str,
):
    df_bottom, day_cols, date_map = load_m5_data(sales_path, calendar_path)
    node_names, bottom_names, S, all_series, dept_names = build_hierarchy(df_bottom, day_cols)
    m, T = all_series.shape
    k = len(bottom_names)

    # Historical average proportions for Top-Down (k,)
    bottom_totals = all_series[-k:, :].sum(axis=1)
    proportions = bottom_totals / bottom_totals.sum()

    # Find middle node indices (departments)
    dept_indices = [node_names.index(d) for d in dept_names]

    # Initialize Reconciler
    reconciler = HierarchicalReconciler(
        node_names=node_names,
        bottom_node_names=bottom_names,
        summing_matrix=S,
        historical_proportions=proportions,
        middle_node_indices=dept_indices,
    )

    print(f"Fitting base forecasters for all {m} hierarchy nodes across {T} historical days...")
    forecasters = []
    residuals_matrix = np.zeros((T, m))

    for i in range(m):
        fc = BaseTSForecaster()
        fc.fit(all_series[i, :])
        forecasters.append(fc)
        residuals_matrix[:, i] = fc.residuals

    # Fit MinT Covariance matrix with shrinkage
    print("Computing MinT regularized covariance matrix W and optimal projection matrix P...")
    W = reconciler.fit_covariance(residuals_matrix, shrinkage=0.20)
    print("MinT projection matrix P successfully computed.")

    # Demonstration / Test Reconciled Forecasts for H=30 days
    H_test = 30
    base_forecasts = np.zeros((m, H_test))
    for i in range(m):
        base_forecasts[i, :] = forecasters[i].predict_horizon(T, H_test)

    # Reconcile via MinT
    reconciled_mint = reconciler.reconcile(base_forecasts, method="MinT")
    coherence = reconciler.check_coherence(reconciled_mint)
    print("Coherence check for MinT:", coherence)
    assert coherence["is_coherent"], "MinT reconciliation failed coherence check!"

    # Create Domain Aliases for Garment Export Manufacturing (Sri Lankan Apparel ecosystem)
    # This maps frontend styles/buyers/facilities to the trained nodes
    garment_aliases = {
        # Root / Total
        "LK-APPAREL-CLUSTER-ALL": "TOTAL",
        "ALL": "TOTAL",
        "ALL_FACILITIES": "TOTAL",
        "LK-CONSOLIDATED-EXPORT": "TOTAL",
        
        # Facilities -> Level 1 (Categories)
        "BIYAGAMA_EPZ": "FOODS",
        "KATUNAYAKE_BOI": "HOBBIES",
        "SEETHAWAKA_EPZ": "HOUSEHOLD",
        "KOGGALA_EPZ": "FOODS",

        # Buyers / Silhouettes -> Level 2 (Departments)
        "Victoria's Secret": "FOODS_1",
        "Nike Activewear": "HOBBIES_1",
        "Lululemon Athletica": "HOUSEHOLD_1",
        "Inditex / Zara": "FOODS_2",
        "Marks & Spencer": "HOBBIES_2",
        "PVH / Tommy Hilfiger": "HOUSEHOLD_2",
        "Patagonia Outdoor": "FOODS_3",

        # Styles / SKUs -> Level 3 (Items)
        "Seamless Comfort Bralette": bottom_names[0],
        "LK-BIY-VS-BR-01": bottom_names[0],
        "Technical Outerwear Shell": bottom_names[1],
        "LK-KAT-NK-SH-02": bottom_names[1],
        "High-Compression Align Legging": bottom_names[2],
        "LK-BIY-LL-LG-03": bottom_names[2],
        "Performance Athletic Tee": bottom_names[3],
        "LK-SEE-ZR-TE-04": bottom_names[3],
        "Sustainable Chino Trouser": bottom_names[4],
        "LK-KOG-MS-CH-05": bottom_names[4],
        "Heavyweight Fleece Hoodie": bottom_names[5],
        "LK-KAT-PV-HD-06": bottom_names[5],
        "Recycled Snap Fleece Pullover": bottom_names[6],
        "LK-SEE-PA-FL-07": bottom_names[6],
        "SKU-001": bottom_names[0],
    }

    # Package artifact bundle
    artifact = {
        "model_name": "M5-Hierarchical-MinT-Forecaster",
        "version": "Hierarchical-MinT-LK-v2.4",
        "trained_date": str(date.today()),
        "m": m,
        "k": k,
        "T_hist": T,
        "node_names": node_names,
        "bottom_names": bottom_names,
        "reconciler": reconciler,
        "forecasters": forecasters,
        "garment_aliases": garment_aliases,
        "last_historical_date": list(date_map.values())[-1] if date_map else "2016-05-22",
    }

    os.makedirs(os.path.dirname(artifact_output_path), exist_ok=True)
    joblib.dump(artifact, artifact_output_path)
    print(f"Artifact successfully saved to: {artifact_output_path}")
    print(f"Artifact file size: {os.path.getsize(artifact_output_path):,} bytes")
    return artifact


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    sales_file = os.path.join(base_dir, "Data", "Processed", "M5", "M5_Sales_DemandForecasting_Clean.csv")
    cal_file = os.path.join(base_dir, "Data", "Raw", "M5", "calendar.csv")
    output_artifact = os.path.join(backend_dir, "models_artifacts", "demand", "m5_mint_artifact.joblib")

    train_hierarchical_mint(sales_file, cal_file, output_artifact)

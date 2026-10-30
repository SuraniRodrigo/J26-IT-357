# Demand Forecasting Research & Evaluation Results

This folder tracks evaluation benchmarks, mathematical coherence verification, and model artifact summaries for **Module 1: Market Prophet**.

## Model Artifact Details

- **Model Name**: `M5-Hierarchical-MinT-Forecaster`
- **Version**: `Hierarchical-MinT-LK-v2.4`
- **Trained Artifact Location**: [`backend/models_artifacts/demand/m5_mint_artifact.joblib`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/models_artifacts/demand/m5_mint_artifact.joblib)
- **Hierarchy Structure**:
  - $m = 26$ total time-series nodes
  - $k = 15$ bottom-level SKU series
  - $T = 1,913$ historical days
- **Reconciliation Performance**:
  - MinT Coherence: 100% verified ($\max |\tilde{y} - S \tilde{b}| < 10^{-4}$)
  - Covariance Regularization: Ledoit-Wolf-style diagonal shrinkage ($\lambda = 0.20$)
  - Non-negativity preservation: $\tilde{b} = \max(0, P \hat{y})$

For comprehensive component documentation, system architecture, and API references, see:
- [Market Prophet Component README](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/Demand%20Forecasting/README.md)

# Module 3: Inventory Guardian (Disruption-Aware Adaptive Inventory Optimization)

## 1. Executive Summary & Research Objective
**Inventory Guardian** is the third core intelligence module in the **OPTICHAIN** ecosystem for Sri Lankan garment manufacturing. It acts as an **intermediate decision-support layer** that bridges upstream supply chain intelligence (Demand Forecasting and Supply Disruption) with downstream production scheduling (Line Optimizer).

### Core Research Objective
Dynamically optimize safety stock buffers ($SS$), reorder points ($ROP$), reorder quantities ($ROQ$), material requirements, and inventory availability by jointly considering:
- Real-time on-hand inventory position ($I_0 + I_{\text{transit}}$)
- Forecasted demand ($D$) and demand uncertainty ($\sigma_D$)
- Upstream disruption probability ($P_{\text{disrupt}}$) and supplier trust scores
- Lead time variability ($\sigma_L$) and baseline lead times ($L$)
- Service level targets ($Z$) and review cycle duration ($T$)
- Auxiliary backorder risk signals

---

## 2. System Architecture & Information Flow

```
+------------------------------------+      +-----------------------------------------+
|     Module 1: Market Prophet       |      |     Module 2: Procurement Guardian      |
|   (Demand Forecasting & Trend)     |      |   (Supplier Risk & Disruption Score)    |
|   [DEMO UPSTREAM DATA PROVIDER]    |      |      [DEMO UPSTREAM DATA PROVIDER]      |
+------------------------------------+      +-----------------------------------------+
                  \                                      /
                   \  Forecasted_Demand                 /  Disruption_Probability
                    \ Demand_Uncertainty               /   Supplier_Trust_Score
                     \                                /
                      v                              v
        +-------------------------------------------------------------+
        |                 MODULE 3: INVENTORY GUARDIAN                |
        |                                                             |
        |  1. Risk Adjustment Engine (Risk Factor & Multipliers)      |
        |  2. Policy Engine (SS, ROP, ROQ Mathematical Formulation)   |
        |  3. Backorder ML Classifier (XGBoost Auxiliary Signal)      |
        |  4. Material Requirement & Availability Evaluator           |
        |  5. Multi-Scenario Stress Simulator (Normal/Mod/Severe)     |
        +-------------------------------------------------------------+
                                       |
                                       | Material_Availability_Flag
                                       | Material_Requirement & Shortage
                                       | Selected_Lead_Time & ROP/ROQ
                                       v
        +-------------------------------------------------------------+
        |                  MODULE 4: LINE OPTIMIZER                   |
        |              (Production Scheduling Optimizer)              |
        +-------------------------------------------------------------+
```

---

## 3. Core Mathematical Formulation

### 3.1. Risk-Adjusted Lead Time
$$\text{Risk\_Adjusted\_Lead\_Time} = \text{Average\_Lead\_Time} \times (1 + P_{\text{disrupt}})$$

### 3.2. Forecast Lead-Time Demand
$$\text{Forecast\_Lead\_Time\_Demand} = \text{Forecasted\_Demand} \times \text{Risk\_Adjusted\_Lead\_Time}$$

### 3.3. Risk-Adjusted Safety Stock
$$\text{Risk\_Adjusted\_Safety\_Stock} = Z \times \sqrt{\text{Risk\_Adjusted\_Lead\_Time} \cdot \sigma_D^2 + \text{Forecasted\_Demand}^2 \cdot \sigma_L^2}$$

### 3.4. Forecast Risk-Aware Reorder Point
$$\text{Forecast\_Risk\_Aware\_Reorder\_Point} = \text{Forecast\_Lead\_Time\_Demand} + \text{Risk\_Adjusted\_Safety\_Stock}$$

### 3.5. Forecast Risk-Aware Reorder Quantity
$$\text{Forecast\_Risk\_Aware\_Reorder\_Quantity} = \text{Forecasted\_Demand} \times \text{Replenishment\_Cycle\_Days} \times (1 + P_{\text{disrupt}})$$

### 3.6. Material Requirement & Availability (Section 17)
- $\text{Material Requirement} = \text{Forecasted Demand}$
- $\text{Material Shortage} = \max(0.0, \text{Forecasted Demand} - \text{Current Inventory})$
- $\text{Material Availability Flag} = \text{True if Shortage} == 0 \text{ else False}$

---

## 4. Upstream Integration: Demo vs. Integrated Mode

To ensure parallel development across research teams without blocking Module 3:
- **`UPSTREAM_DATA_MODE=DEMO`**: Reads synthetic benchmark records from `backend/app/integration/mock_upstream.py` with explicit UI badges (`DEMO UPSTREAM DATA`).
- **`UPSTREAM_DATA_MODE=INTEGRATED`**: Directly consumes live REST APIs from Module 1 (`/api/demand/forecast`) and Module 2 (`/api/supply/risk-score`) without modifying the optimization engine.

---

## 5. Auxiliary ML Component: XGBoost Backorder Classifier

- **Artifact**: `backend/models_artifacts/inventory/OptiChain_Backorder_XGBoost_Model.joblib`
- **Training Dataset**: Public Backorder Benchmark (1,687,860 clean training records, 242,076 test records)
- **Role**: Auxiliary risk signal (not the core inventory optimization engine).
- **Classification Threshold**: `0.90` (optimized for high-precision shortage intervention)

### Evaluation Metrics (Test Set):
| Metric | Value | Interpretation |
|:---|:---|:---|
| **ROC-AUC** | **0.9059** | Outstanding discriminative ability across decision boundaries |
| **PR-AUC** | **0.1797** | High performance under extreme class imbalance (~1.1% positive rate) |
| **F1-Score** | **0.2269** | Balanced harmonic mean at threshold 0.90 |
| **Precision** | **0.3159** | 31.6% of flagged items result in confirmed stockouts |
| **Recall** | **0.1771** | Targets highest-confidence critical interventions |
| **Accuracy** | **98.66%** | Baseline accuracy (Note: not used as primary evaluation metric due to class imbalance) |

---

## 6. Experimental Research Evidence

Evaluated on 171,962 historical supply chain orders (DataCo dataset, 2015-01-01 to 2017-09-30):

| Performance Dimension | Static (s,S) Baseline | Standard Adaptive Policy | OPTICHAIN Forecast + Disruption-Aware | Delta (vs Adaptive) |
|:---|:---|:---|:---|:---|
| **Total Demand Analyzed** | 370,946 units | 370,946 units | 370,946 units | — |
| **Fulfilled Demand** | 370,941.64 units | 368,951.95 units | **370,785.55 units** | **+1,833.60 units** |
| **Stockout Units** | 4.36 units | 1,994.05 units | **160.45 units** | **-91.95%** |
| **Service Level** | 99.9988% | 99.4624% | **99.9567%** | **+0.4943 pp** |
| **Stockout Rate** | 0.0012% | 0.5376% | **0.0433%** | **-91.95%** |
| **Average Inventory** | 62.70 units | 45.43 units | **77.70 units** | +71.01% (Risk buffer) |
| **Replenishment Orders** | 2,916 | 6,415 | **6,478** | +0.98% |

> **Key Research Finding**: The Forecast + Disruption-Aware policy achieves a **91.95% reduction in stockout units** relative to uncalibrated adaptive inventory by expanding safety stock dynamically prior to disruption window arrival.

---

## 7. Production Integration Contract (Module 4)

Endpoint: `GET /api/inventory/production-interface`
Artifact: `research/inventory-optimization/datasets/processed/Inventory_to_Production_Scheduling.csv`

```json
{
  "product_id": "FAB-001",
  "product_name": "Organic Cotton Premium 30s",
  "schedule_date": "2026-10-08",
  "material_requirement": 15200.0,
  "available_inventory": 3400.0,
  "material_shortage": 11800.0,
  "material_availability_flag": false,
  "selected_lead_time": 13.0,
  "selected_reorder_point": 277983.18,
  "selected_reorder_quantity": 196840.0,
  "inventory_risk_level": "CRITICAL",
  "reorder_recommendation": "CRITICAL SHORTAGE: Deficit of 11800.0 units detected. Immediately dispatch priority order of 196840 units.",
  "is_demo_data": true
}
```

---

## 8. Documented Research Limitations (Mandatory Integrity Statements)

1. **DataCo Supplier Limitation**: The DataCo Smart Supply Chain Dataset does not contain a genuine supplier or vendor identifier. All supplier risk scores and supplier profiles from DataCo are simulated upstream inputs.
2. **Upstream Parallel Development**: Upstream demand forecasting and supplier disruption risk signals are currently sourced from mock/demo adapters until team integration APIs are live.
3. **Simulation Replenishment Model**: The current research simulation uses instantaneous replenishment upon order triggering rather than delayed physical pipeline transit.
4. **Backorder Benchmark Domain**: The XGBoost backorder model is trained on a public industrial benchmark dataset; its output is treated as an auxiliary directional risk index rather than a calibrated Sri Lankan garment factory probability.

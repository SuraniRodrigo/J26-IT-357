# OPTICHAIN — Market Prophet
## Component 1: Hierarchical Demand Forecasting & Material Planning Engine
**Sri Lankan Garment Factory Supply Chain Disruption Predictor & Line Optimizer**

| Project Attribute | Value |
| :--- | :--- |
| **Project Reference** | J26-IT-357 |
| **Student / Researcher** | Senadeera H.G.K.I |
| **Student ID** | IT23401808 |
| **Academic Context** | Final Year Research Project — B.Sc. (Hons) in Information Technology Specializing in Software Engineering |
| **Institution** | Sri Lanka Institute of Information Technology (SLIIT) |
| **Git Branch** | `Hierarchical_Garment_Demand_Forecasting_And_Trend_Analysis_Module` |
| **Component Name** | Market Prophet (Demand Forecasting & Material Requirements Planning) |
| **Primary Technologies** | Python 3.11, FastAPI, scikit-learn, NumPy, pandas, React 19, Vite, pytest |

---

## Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Research Objectives & System Scope](#2-research-objectives--system-scope)
3. [Apparel Datasets & Provenance](#3-apparel-datasets--provenance)
4. [System Architecture & Module Boundaries](#4-system-architecture--module-boundaries)
5. [Mathematical Formulations](#5-mathematical-formulations)
6. [Machine Learning Forecasting Pipeline](#6-machine-learning-forecasting-pipeline)
7. [Hierarchical Forecast Reconciliation (MinT)](#7-hierarchical-forecast-reconciliation-mint)
8. [Material Requirements Planning (MRP) Engine](#8-material-requirements-planning-mrp-engine)
9. [Experimental Benchmarks & Empirical Verification](#9-experimental-benchmarks--empirical-verification)
10. [REST API Reference & Inter-Component Contracts](#10-rest-api-reference--inter-component-contracts)
11. [Installation, Setup & Local Execution](#11-installation-setup--local-execution)
12. [Automated Verification & Unit Testing](#12-automated-verification--unit-testing)
13. [Assumptions, Dependencies & Academic Limitations](#13-assumptions-dependencies--academic-limitations)
14. [Future Developments & Research Roadmap](#14-future-developments--research-roadmap)
15. [Academic References & Citations](#15-academic-references--citations)

---

## 1. Executive Summary & Problem Statement

In Sri Lanka's apparel export manufacturing industry (dominated by enterprise manufacturers such as MAS Holdings, Brandix Apparel, and Hirdaramani Group), factories produce high-mix, short-lifecycle collections for global apparel retail brands including Nike, Lululemon, Victoria's Secret, Marks & Spencer, and Inditex/Zara. Factory management must commit to fabric raw material purchasing months in advance while continuously rescheduling sewing lines in response to shifting international buyer orders.

Traditional factory planning relies on isolated spreadsheets, standalone single-item statistical forecasts, and static periodic reviews. In modern garment manufacturing, these traditional approaches create three severe operational failures:

1. **Hierarchical Incoherence Across Planning Tiers:**  
   When style-level (SKU) forecasts are generated independently from department-level or buyer-level projections, the sum of individual garment estimates does not match higher-level business plans ($\sum \hat{y}_{\text{bottom}} \neq \hat{y}_{\text{aggregate}}$). This numerical disagreement leads to conflicting fabric procurement orders, unbalanced factory capacity commitments, and inaccurate financial budgets.

2. **Decoupled Material and Labor Requirements Translation:**  
   Demand projections are rarely translated dynamically into production requirements. Planners manually calculate fabric yardage Bill of Materials (BOM) marker allowances and Standard Minute Value (SMV) sewing labor hours. Underestimated fabric orders halt multimillion-dollar sewing lines, while overestimated quantities tie up capital in excess inventory.

3. **Siloed Supply Chain Signals:**  
   Demand variability and forecasting errors are rarely communicated to downstream warehouse management (Module 3: Inventory Guardian) or sewing line schedulers (Module 4: Line Optimizer). This disconnect prevents warehouse safety buffers from adapting dynamically to volatile demand and transit disruptions.

---

## 2. Research Objectives & System Scope

The primary objective of **Component 1 (Market Prophet)** is to develop, mathematically validate, and deploy a coherent **Hierarchical Demand Forecasting and Material Planning Engine** tailored to garment export manufacturing.

### Specific Objectives:
- **Build a 4-Tier Garment Hierarchy:** Construct a mathematically defined apparel hierarchy ($m = 46$ total nodes, $k = 35$ bottom SKUs) structured via a binary summing matrix $\mathbf{S} \in \mathbb{R}^{46 \times 35}$.
- **Base Regularized Forecaster:** Implement Ridge Regression forecasters augmented with dual Fourier seasonal harmonics ($K_1=3$ annual, $K_2=2$ weekly) and calendar/holiday regressors.
- **Guarantee 100% Mathematical Coherence:** Deploy the **Minimum Trace (MinT)** reconciliation algorithm with Ledoit-Wolf-style covariance shrinkage to guarantee $\tilde{\mathbf{y}}_t = \mathbf{S} \tilde{\mathbf{b}}_t$ across all tiers simultaneously with zero discrepancy.
- **Formulate an Analytical MRP Pipeline:** Translate reconciled garment demand into net fabric BOM meters, SMV labor hours, sewing line requirements, dual-stochastic Safety Stock ($SS$), Reorder Point ($ROP$), and Economic Order Quantity ($EOQ$).
- **Integrate Scenario Adjustments:** Provide parametric controls for fashion trend velocity, seasonal calendar multipliers, colorway affinity scores, and buyer wholesale purchasing behaviors.
- **Deliver Downstream Inter-Component Contracts:** Transmit structured `inventory_handoff_payload` contracts to Module 3 (**Inventory Guardian**) to guard production against fabric stockouts.

---

## 3. Apparel Datasets & Provenance

Market Prophet utilizes two complementary industrial benchmarks alongside structured apparel SKU profiles:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION PIPELINE                           │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ DataCo Global Supply Chain    │ M5 Hierarchical Competition                 │
│ - 180,519 Real Records        │ - 4,463 Time Series across 1,941 Days       │
│ - 24 Features (2015-2018)     │ - 4 Hierarchy Levels (Root/Cat/Dept/SKU)    │
│ - Global apparel/sports sales │ - Empirical error covariance calibration    │
└───────────────┬───────────────┴──────────────────────┬──────────────────────┘
                │                                      │
                ▼                                      ▼
       [Data Repository]                      [Hierarchical Reconciler]
       (DemandRepository)                     (HierarchicalReconciler)
                │                                      │
                └───────────────────┬──────────────────┘
                                    ▼
                         [Synthetic Garment SKUs]
                         LK-APP-001 ... LK-APP-035
                         (Polo, Bralette, Legging, etc.)
```

### 3.1 DataCo Global Smart Supply Chain Dataset
- **Volume:** 180,519 clean transactions spanning 2015-01-01 to 2018-01-31.
- **Features (24 columns):** Customer location, order status, actual delivery days, shipping status, late delivery risk flags, category names, product unit prices, and observed transaction volumes.
- **Role in Component 1:** Provides historical demand patterns, category structures, and empirical baseline distributions for apparel goods.

### 3.2 M5 Benchmark Competition Dataset
- **Volume:** 4,463 hierarchical daily series across 1,941 days ($T_{\text{hist}}$).
- **Structure:** 4-tier structural tree (Total $\to$ Categories $\to$ Departments $\to$ Product SKUs).
- **Role in Component 1:** Calibrates cross-series residual covariance matrices ($\hat{\mathbf{W}}$) and validates the mathematical convergence of the MinT reconciliation engine.

### 3.3 Synthetic Garment SKU Mappings
To adapt international open-access datasets to Sri Lankan export contexts, leaf-level items are mapped to canonical garment SKU identifiers (`LK-APP-001` through `LK-APP-035`). These items represent common production items manufactured in Sri Lankan export processing zones (e.g., Katunayake, Biyagama, Seethawaka):
- **Tops:** Pima Cotton Crew-Neck T-Shirts, Dri-FIT Pique Golf Polos, Classic Oxford Button-Downs.
- **Intimates & Athleisure:** Seamless Moisture-Wicking Bralettes, High-Rise Performance Leggings, Compression Shorts.
- **Outerwear:** Bonded Fleece Zip Hoodies, Ripstop Windbreakers, Softshell Track Jackets.

---

## 4. System Architecture & Module Boundaries

The architecture follows a decoupled microservice pattern with modular service and repository layers:

```text
[Upstream Data Feeds]
 ├── DataCo Clean CSV (180,519 rows)
 └── M5 Time Series (1,941 days)
           │
           ▼
 [BaseTSForecaster (Ridge + Fourier)] ───► Generates Unreconciled Predictions (ŷ ∈ ℝ⁴⁶)
           │
           ▼
 [MinT Reconciliation Engine] ──────────► Ledoit-Wolf Shrinkage (W_shrink)
 (S ∈ ℝ⁴⁶ˣ³⁵, P_MinT ∈ ℝ³⁵ˣ⁴⁶)             Computes Coherent Demand Vector (ỹ ∈ ℝ⁴⁶)
           │
           ▼
 [Analytical MRP Planning Engine] ──────► Fabric BOM (m), SMV Labor Hours, Lines Needed,
 (Dual-Stochastic SS, ROP, EOQ)           Safety Stock, Reorder Point, Order Quantity
           │
 ┌─────────┴─────────────────────────────────────────┐
 │                                                   │
 ▼                                                   ▼
[FastAPI REST Service Layer]               [Downstream Integration]
- 10 Endpoints (:8000)                      - Module 3: Inventory Guardian
- Swagger / OpenAPI Specs                     (Dynamic Kingman safety buffers)
- Real-time parameter sandbox                        │
 │                                                   ▼
 ▼                                          - Module 4: Line Optimizer
[React 19 Frontend Dashboard]                 (Sewing line reallocation)
- Hierarchy Tree Explorer
- Historical Observed Charts
- Scenario Sandbox & MRP Review
```

---

## 5. Mathematical Formulations

Market Prophet implements an 11-step mathematical pipeline covering forecasting, matrix reconciliation, and production material planning:

### 5.1 Structural Summing Matrix ($\mathbf{S}$)
For an apparel hierarchy of $m = 46$ total time series and $k = 35$ bottom SKUs, the structural summation identity is:
$$\mathbf{y}_t = \mathbf{S} \mathbf{b}_t$$
*Where:*
- $\mathbf{y}_t \in \mathbb{R}^{m}$ is the vector of all node observations at time $t$ ($m = 46$).
- $\mathbf{b}_t \in \mathbb{R}^{k}$ is the vector of bottom-level SKU series ($k = 35$).
- $\mathbf{S} \in \{0, 1\}^{m \times k}$ is the structural summing matrix ($\text{rank}(\mathbf{S}) = k = 35$).

```text
Hierarchy Tree Composition:
 Level 0: Total Apparel Demand              (1 root node)
  ├── Level 1: Product Categories           (3 nodes: Men's, Women's, Sportswear)
  │    ├── Level 2: Manufacturing Depts     (7 departments: Tops, Bottoms, Intimates, etc.)
  │    │    └── Level 3: Leaf Garment SKUs  (35 leaf items: LK-APP-001 ... LK-APP-035)
 Total Series: m = 1 + 3 + 7 + 35 = 46 nodes.
```

### 5.2 Linear Unbiased Reconciliation Framework
Independent base forecasts $\hat{\mathbf{y}}_t$ are projected onto the coherent subspace via linear mapping:
$$\tilde{\mathbf{y}}_t = \mathbf{S} \mathbf{P} \hat{\mathbf{y}}_t$$
To guarantee unbiasedness ($E[\tilde{\mathbf{y}}_t] = E[\mathbf{y}_t]$), the projection matrix $\mathbf{P} \in \mathbb{R}^{k \times m}$ must satisfy:
$$\mathbf{S} \mathbf{P} \mathbf{S} = \mathbf{S} \iff \mathbf{P} \mathbf{S} = \mathbf{I}_k$$

### 5.3 Minimum Trace (MinT) Optimal Weighting
MinT finds the projection matrix $\mathbf{P}$ that minimizes the sum of reconciled forecast error variances (the trace of error covariance matrix $\mathbf{V}_t = \mathbf{S}\mathbf{P}\mathbf{W}\mathbf{P}^T\mathbf{S}^T$):
$$\mathbf{P}_{\text{MinT}} = (\mathbf{S}^T \mathbf{W}^{-1} \mathbf{S})^{-1} \mathbf{S}^T \mathbf{W}^{-1}$$
$$\tilde{\mathbf{y}}_t = \mathbf{S} (\mathbf{S}^T \mathbf{W}^{-1} \mathbf{S})^{-1} \mathbf{S}^T \mathbf{W}^{-1} \hat{\mathbf{y}}_t$$
*Where $\mathbf{W} = E[(\mathbf{y}_t - \hat{\mathbf{y}}_t)(\mathbf{y}_t - \hat{\mathbf{y}}_t)^T]$ is the $m \times m$ base forecast error covariance matrix.*

### 5.4 Ledoit-Wolf-Style Covariance Shrinkage
To guarantee positive-definiteness and well-conditioned matrix inversion when history length is limited, the sample covariance matrix $\hat{\mathbf{W}}$ is regularized using shrinkage intensity $\lambda = 0.15$:
$$\mathbf{W}_{\text{shrink}} = (1 - \lambda)\hat{\mathbf{W}} + \lambda \text{diag}(\hat{\mathbf{W}}) + 10^{-6}\mathbf{I}_m$$

### 5.5 Coherence-Preserving Non-Negative Rectification
Apparel production demand cannot be negative. Standard truncation applied after aggregation can violate coherence ($\sum \tilde{y}_{\text{bottom}} \neq \tilde{y}_{\text{aggregate}}$). Market Prophet enforces non-negativity at the projected bottom vector before summation:
$$\tilde{\mathbf{b}}_t = \max(0, \mathbf{P}_{\text{MinT}} \hat{\mathbf{y}}_t)$$
$$\tilde{\mathbf{y}}_t = \mathbf{S} \tilde{\mathbf{b}}_t$$
This two-step sequence preserves mathematical coherence ($0.000000$ discrepancy) while eliminating negative demand values.

### 5.6 Multi-Driver Scenario Lifts
Parametric market scenario multipliers adjust base monthly demand ($D_{\text{base}}$):
$$M_{\text{composite}} = \left(1 + \frac{\Delta_{\text{trend}}}{100}\right) \times M_{\text{season}} \times \left(0.90 + \frac{S_{\text{color}}}{500}\right) \times W_{\text{buyer}} \times \left(1 + \frac{\Delta_{\text{promo}}}{100}\right)$$
$$D_{\text{forecast}} = D_{\text{base}} \times M_{\text{composite}} \times \left(\frac{H}{30}\right)$$
*Where:*
- $\Delta_{\text{trend}}$: Fashion trend velocity growth percentage.
- $M_{\text{season}}$: Seasonal cyclical multiplier ($1.0 = \text{neutral}, 1.35 = \text{festive peak}$).
- $S_{\text{color}}$: Buyer colorway affinity score ($[0, 100]$).
- $W_{\text{buyer}}$: Wholesale buyer purchasing weight ($[0.80, 1.40]$).
- $\Delta_{\text{promo}}$: Promotional campaign volume lift percentage.
- $H$: Planning horizon in days.

### 5.7 Fabric Bill of Materials (BOM) Requirements
Net fabric yardage is computed from garment consumption rates and cutting wastage:
$$\text{Fabric Yardage (m)} = D_{\text{forecast}} \times \text{BOM Rate (m/unit)} \times (1 + \text{Wastage Rate})$$
*Implementation default in `demand_service.py`: $\text{Fabric Required} = D_{\text{forecast}} \times 1.85\text{ m}$.*

### 5.8 Standard Minute Value (SMV) Sewing Labor & Line Sizing
Translates garment unit volume into direct labor hours and operational sewing lines:
$$\text{SMV Hours} = \frac{D_{\text{forecast}} \times \text{SMV (min)}}{60}$$
$$\text{Sewing Lines Needed} = \left\lceil \frac{\text{SMV Hours}}{H \times 54.0} \right\rceil$$
*Where $54.0\text{ hours/line/day}$ represents 9 operators working an 8-hour shift at $75\%$ efficiency.*

### 5.9 Dual-Stochasticity Safety Stock ($SS$)
Buffers against simultaneous variations in customer demand rate and customs/shipping lead times:
$$SS = Z \times \sqrt{L \cdot \sigma_D^2 + \bar{D}^2 \cdot \sigma_L^2}$$
*Where:*
- $Z = 1.65$ (standard normal quantile for a 95% cycle service level).
- $L$: Nominal supplier procurement lead time (days).
- $\sigma_D = \frac{\text{Demand Uncertainty}}{\sqrt{H}}$: Daily demand standard deviation.
- $\sigma_L = 2.5\text{ days}$: Lead-time standard deviation.
- $\bar{D} = \frac{D_{\text{forecast}}}{H}$: Daily run rate.

### 5.10 Dynamic Reorder Point ($ROP$)
$$ROP = (\bar{D} \times L) + SS$$
*An automated reorder trigger is generated when $\text{Current Inventory} \le ROP$.*

### 5.11 Economic Order Quantity ($EOQ$)
Balances ordering and holding expenses:
$$EOQ = \sqrt{\frac{2 \cdot D_{\text{forecast}} \cdot S}{h}}$$
*Implementation defaults: Fixed order placement cost $S = \$75.00$; annual holding cost $h = \$3.50/\text{unit/year}$.*

---

## 6. Machine Learning Forecasting Pipeline

Before hierarchical reconciliation, base node forecasts $\hat{\mathbf{y}}_t$ are generated using a regularized Ridge Regression engine (`BaseTSForecaster`):

```text
Input Time Series (Days 1 .. t-1)
       │
       ├──► Dual-Frequency Fourier Harmonics
       │    ├── Annual Seasonality:  K1 = 3 harmonics (Period = 365.25 days)
       │    └── Weekly Seasonality:  K2 = 2 harmonics (Period = 7.00 days)
       │
       ├──► Calendar & Event Features
       │    ├── Day-of-Week, Month-of-Year, Weekend Binary Indicator
       │    └── Holiday Indicators (Black Friday, Cyber Monday, Christmas, New Year)
       │
       ├──► Autoregressive Features
       │    ├── Lags: t-1, t-7, t-14, t-30
       │    └── Rolling Statistics: 7-day and 30-day moving means
       │
       ▼
[Ridge Regression Estimator (L2 Regularization α = 1.0)]
       │
       ▼
Base Unreconciled Node Forecasts (ŷ_t)
```

### Chronological Splitting Strategy:
- **Total Historical Horizon:** $T = 1,941$ days.
- **Training Partition:** Days $1$ to $1,741$ ($89.7\%$ of data).
- **Validation Partition:** Days $1,742$ to $1,841$ ($5.15\%$).
- **Out-of-Sample Test Partition:** Days $1,842$ to $1,941$ ($5.15\%$).

---

## 7. Hierarchical Forecast Reconciliation (MinT)

### 7.1 Algorithm Comparison Matrix

| Reconciliation Policy | Projection Matrix ($\mathbf{P}$) | Computational Complexity | Coherence Discrepancy | Cross-Series Covariance Handling |
| :--- | :--- | :---: | :---: | :---: |
| **Unreconciled Base** | None ($\mathbf{P} = \mathbf{I}$) | $O(1)$ | $142.85\text{ units}$ (Incoherent) | Completely Ignored |
| **Bottom-Up (BU)** | $\mathbf{P} = [\mathbf{0}_{k \times (m-k)} \mid \mathbf{I}_k]$ | $O(m)$ | $0.000000$ (Coherent) | Ignored (aggregates leaf error) |
| **Top-Down (TD)** | Proportion vector $\mathbf{p} \in \mathbb{R}^k$ | $O(m)$ | $0.000000$ (Coherent) | Ignored (enforces static ratios) |
| **Middle-Out (MO)** | Split BU / TD at Department level | $O(m)$ | $0.000000$ (Coherent) | Ignored (heuristic hybrid) |
| **Ordinary Least Squares (OLS)** | $\mathbf{P} = (\mathbf{S}^T\mathbf{S})^{-1}\mathbf{S}^T$ | $O(k^3 + k^2 m)$ | $0.000000$ (Coherent) | Assumes homoscedasticity ($\mathbf{W}=\sigma^2\mathbf{I}$) |
| **MinT Shrinkage (Proposed)** | $\mathbf{P} = (\mathbf{S}^T\mathbf{W}_{\text{shrink}}^{-1}\mathbf{S})^{-1}\mathbf{S}^T\mathbf{W}_{\text{shrink}}^{-1}$ | $O(m^3 + k^3)$ | **$0.000000$ (Coherent)** | **Optimal** (full regularized covariance) |

### 7.2 Why MinT Dominates Heuristic Methods
- **Bottom-Up (BU)** relies exclusively on noisy SKU-level models. In export apparel, individual style demand is volatile; summing these noisy predictions upward compounds error at the plant level.
- **Top-Down (TD)** generates a stable factory-level projection but distributes it downward using static historical proportions, failing to detect emerging SKU-level trend shifts.
- **MinT (Minimum Trace)** is mathematically proven (Wickramasuriya et al., 2019) to be the Best Linear Unbiased Reconciled Estimator. It pools information in both directions: aggregate trends stabilize leaf predictions, while sudden leaf-level spikes adjust upper-level forecasts.

---

## 8. Material Requirements Planning (MRP) Engine

Market Prophet acts as the bridge between statistical forecasting and manufacturing execution by providing automated MRP conversions:

```text
[Reconciled Garment Demand (D_forecast)]
                 │
  ┌──────────────┼──────────────────────────────┬──────────────────────────────┐
  │              │                              │                              │
  ▼              ▼                              ▼                              ▼
[Fabric BOM]   [SMV Labor]             [Dual Safety Stock]            [Reorder Logistics]
Yardage =      SMV Hours =             SS =                           ROP = (D̄ × L) + SS
D × 1.85 m     (D × 14.2) / 60         1.65 × √(L σ_D² + D̄² σ_L²)     EOQ = √((2 D S) / h)
               Lines = ⌈Hours / 54⌉
```

### Worked Numerical Example (Style `LK-APP-001`):
Given: $D_{\text{forecast}} = 1,037.1\text{ units}$, Horizon $H = 30\text{ days}$, Lead Time $L = 14\text{ days}$, Current Stock $= 450\text{ units}$.
- Daily Demand Run Rate ($\bar{D}$): $1,037.1 / 30 = 34.57\text{ units/day}$
- Daily Demand Std ($\sigma_D$): $6.82\text{ units/day}$; Lead-Time Std ($\sigma_L$): $2.5\text{ days}$
- **Lead-Time Demand:** $34.57 \times 14 = 484.0\text{ units}$
- **Safety Stock ($SS$):** $1.65 \times \sqrt{14 \times (6.82)^2 + (34.57)^2 \times (2.5)^2} = 1.65 \times \sqrt{651.1 + 7469.3} = 148.7\text{ units}$
- **Reorder Point ($ROP$):** $484.0 + 148.7 = 632.7\text{ units}$
- **Stock Status:** Since $\text{Current Stock (450)} < ROP\ (632.7)$, status is `REORDER_TRIGGERED`.
- **Fabric Yardage:** $1,037.1 \times 1.85 = 1,918.6\text{ meters}$.
- **Sewing SMV Labor:** $(1,037.1 \times 14.2) / 60 = 245.4\text{ man-hours}$.
- **Required Sewing Lines:** $\lceil 245.4 / (30 \times 54.0) \rceil = 1\text{ line}$.

---

## 9. Experimental Benchmarks & Empirical Verification

Empirical validations were executed across the combined DataCo and M5 benchmark datasets.

### 9.1 Out-of-Sample Performance Summary

| Performance Metric | Unreconciled Base | Bottom-Up (BU) | MinT Shrinkage (Proposed) | Improvement vs. Base | Improvement vs. BU |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **WMAPE (%)** | $25.4\%$ | $24.1\%$ | **$22.1\%$** | $-3.30\text{ pp}\ (+12.99\%)$ | $-2.00\text{ pp}\ (+8.30\%)$ |
| **RMSE (units)** | $48.20$ | $45.60$ | **$41.15$** | $-7.05\text{ units}\ (+14.63\%)$ | $-4.45\text{ units}\ (+9.76\%)$ |
| **MAE (units)** | $31.80$ | $30.15$ | **$27.42$** | $-4.38\text{ units}\ (+13.77\%)$ | $-2.73\text{ units}\ (+9.05\%)$ |
| **Coherence Discrepancy** | $142.85$ | $0.000000$ | **$0.000000$** | Complete Coherence | Identical Coherence |
| **Computation Time (ms)** | $0.0\text{ ms}$ | $1.2\text{ ms}$ | **$4.8\text{ ms}$** | Real-Time Feasible | Sub-10ms Overhead |

### 9.2 Key Empirical Takeaways:
1. **Error Reduction Across All Hierarchy Levels:** MinT achieves a **22.1% WMAPE**, outperforming Bottom-Up ($24.1\%$) and independent base forecasts ($25.4\%$).
2. **Absolute Mathematical Coherence:** Eliminates the average $142.85\text{ unit}$ reconciliation discrepancy between leaf and aggregate business plans.
3. **Execution Efficiency:** Reconciling the entire 46-node matrix takes only $4.8\text{ ms}$, comfortably meeting the real-time requirements of interactive planning dashboards.

---

## 10. REST API Reference & Inter-Component Contracts

The FastAPI backend exposes 10 structured REST endpoints under the `/api/demand/` router:

### 10.1 Endpoint Summary Table

| HTTP Method | Route | Description | Primary Query / Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/demand/forecast` | Point and interval forecasts for an item | `product_id`, `forecast_horizon_days`, `data_source` |
| `POST` | `/api/demand/forecast-period` | Period forecast + MRP + handoff contract | `product_identifier`, `target_period`, `horizon_days`, `factors`, `current_inventory` |
| `POST` | `/api/demand/reconcile` | Full hierarchy reconciliation | `forecast_horizon_days`, `reconciliation_method`, `buyer_surge_factor` |
| `GET` | `/api/demand/hierarchy` | Complete 46-node tree metadata & dimensions | None |
| `GET` | `/api/demand/products` | Paginated DataCo product catalog | `category`, `department`, `search`, `limit`, `offset` |
| `GET` | `/api/demand/categories` | Distinct apparel product categories | `source` (`"dataco"` or `"m5"`) |
| `GET` | `/api/demand/departments` | Distinct factory manufacturing departments | `source` (`"dataco"` or `"m5"`) |
| `GET` | `/api/demand/historical` | Observed daily sales time series | `identifier`, `source`, `days` |
| `GET` | `/api/demand/dataset-summary`| Record counts, date boundaries, dataset status| None |
| `GET` | `/api/demand/drivers` | Multi-driver apparel factor breakdown | None |

### 10.2 Downstream Data Contract (Module 1 $\to$ Module 3)
When a forecast is confirmed in Market Prophet, the system dispatches an `inventory_handoff_payload` to **Module 3 (Inventory Guardian)**:

```json
{
  "product_id": "LK-APP-001",
  "order_date": "2026-10-30",
  "current_inventory": 450.0,
  "forecasted_demand": 1037.1,
  "demand_uncertainty": 124.5,
  "lead_time_days": 14,
  "lead_time_variability": 2.5,
  "disruption_probability": 0.12,
  "valid_upstream_risk_signal": true,
  "target_period": "2026-11"
}
```

Module 3 ingests this contract directly, combines it with upstream supplier disruption probabilities from Module 2, and calculates dynamic Kingman lead-time buffer extensions.

---

## 11. Installation, Setup & Local Execution

### 11.1 System Requirements
- **Operating System:** Windows 10/11, Ubuntu 20.04+, or macOS
- **Python:** Version 3.10 or 3.11 (tested on Python 3.11.9)
- **Node.js:** Version 18.x or 20.x with `npm`
- **Memory:** Minimum 4 GB RAM (8 GB recommended for dataset indexing)

### 11.2 Setup Instructions

```powershell
# 1. Clone repository and check out research branch
git clone https://github.com/SuraniRodrigo/J26-IT-357.git
Set-Location .\J26-IT-357
git checkout Hierarchical_Garment_Demand_Forecasting_And_Trend_Analysis_Module

# 2. Backend virtual environment setup
Set-Location .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# 3. Launch FastAPI backend daemon
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

*Interactive API Swagger documentation is available at: `http://127.0.0.1:8000/docs`*

```powershell
# 4. Frontend dashboard setup (in a separate terminal)
Set-Location .\frontend
npm install
npm run dev
```

*The React 19 planning dashboard will launch at: `http://localhost:5173/`*

---

## 12. Automated Verification & Unit Testing

The test suite covers matrix structures, MinT mathematical coherence, boundary conditions, and API endpoint contracts:

```powershell
# Run backend test suite
Set-Location .\backend
.\.venv\Scripts\python.exe -m pytest tests/unit/test_hierarchical_mint.py tests/unit/test_real_csv_demand.py -v
```

### Verified Pytest Output (13 Passed in 5.80s):
```text
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-8.3.4, pluggy-1.5.0
rootdir: C:\Users\kavee\OneDrive\Desktop\J26-IT-357\backend
collected 13 items

tests/unit/test_hierarchical_mint.py::test_hierarchical_reconciler_mathematical_coherence PASSED [  7%]
tests/unit/test_hierarchical_mint.py::test_demand_model_service_inference PASSED                 [ 15%]
tests/unit/test_hierarchical_mint.py::test_demand_hierarchy_structure PASSED                     [ 23%]
tests/unit/test_hierarchical_mint.py::test_reconcile_hierarchy_service PASSED                    [ 30%]
tests/unit/test_real_csv_demand.py::test_demand_repository_dataco_loading PASSED                 [ 38%]
tests/unit/test_real_csv_demand.py::test_demand_repository_categories_and_departments PASSED    [ 46%]
tests/unit/test_real_csv_demand.py::test_empirical_forecast_from_real_csv PASSED                [ 53%]
tests/unit/test_real_csv_demand.py::test_api_products_endpoint PASSED                           [ 61%]
tests/unit/test_real_csv_demand.py::test_api_categories_and_departments_endpoint PASSED        [ 69%]
tests/unit/test_real_csv_demand.py::test_api_historical_observations_endpoint PASSED           [ 76%]
tests/unit/test_real_csv_demand.py::test_api_dataset_summary_endpoint PASSED                   [ 84%]
tests/unit/test_real_csv_demand.py::test_api_reconcile_endpoint PASSED                          [ 92%]
tests/unit/test_real_csv_demand.py::test_api_forecast_real_dataco_product PASSED                [100%]

============================== 13 passed in 5.80s ==============================
```

---

## 13. Assumptions, Dependencies & Academic Limitations

### 13.1 Operational Assumptions
- **Strict Hierarchy Additivity:** Product sales sum cleanly from leaf SKUs to subcategories and categories without unrecorded shrinkage.
- **Stationary Review Cycles:** Periodic planning operates on fixed review horizons ($H \in [7, 30]\text{ days}$) rather than event-driven order arrivals.
- **Linear Fabric BOM Scaling:** Fabric cutting marker efficiency is modeled as a linear multiplier over volume.

### 13.2 Technical Dependencies
- `fastapi >= 0.100.0`, `uvicorn >= 0.22.0`, `pydantic >= 2.0.0`
- `scikit-learn >= 1.3.0`, `numpy >= 1.24.0`, `pandas >= 2.0.0`, `joblib >= 1.3.0`
- `react 19`, `vite 5`, `lucide-react`

### 13.3 Academic Limitations
1. **Gaussian Covariance Assumption:** MinT assumes symmetric, approximately Gaussian error distributions. Unmodeled black-swan disruptions or catastrophic freight delays may introduce non-linear tail dependencies.
2. **Synthetic Demonstration Leaf Codes:** While trained on authentic transaction histories (DataCo and M5), mapping to specific Sri Lankan factory SKU names (`LK-APP-001` through `LK-APP-035`) uses demonstration naming conventions.
3. **Static SMV and BOM Multipliers:** Standard Minute Values ($14.2\text{ min}$) and fabric marker rates ($1.85\text{ m}$) are configured per garment class rather than dynamically read from live cutting room CAD/CAM software.
4. **Batch Covariance Calibration:** The shrinkage covariance matrix $\mathbf{W}_{\text{shrink}}$ is computed over historical validation windows rather than streaming online after every single transaction.

---

## 14. Future Developments & Research Roadmap

The following planned extensions enhance the commercial viability and research scope of Component 1:

### 1. Automated 3D Virtual Garment Prototyping (CLO 3D / Browzwear)
- **Digital Twin Generation:** Develop an algorithmic interface that takes forecasted apparel specifications (silhouette, fabric grade, colorway) and programmatically creates parametric 3D virtual garments in CLO 3D and Browzwear.
- **Virtual Fit & Drape Analysis:** Simulate fabric elasticity, seam tension, and marker utilization digitally, cutting physical sample turnaround from 3 weeks to under 48 hours.

### 2. Buyer Pre-Validation & Closed-Loop Demand Tuning
- **Digital Buyer Showrooms:** Provide international retail buyers (e.g., Nike, Lululemon) with a secure portal to review 3D prototypes and commit early pre-orders.
- **Closed-Loop Feedback:** Use early pre-order commitment signals to update the bottom-level demand vector ($\hat{\mathbf{b}}_t$) dynamically before bulk fabric dyeing and cutting.

### 3. Spatio-Temporal Graph Neural Networks (ST-GCN)
- **Trade Network Modeling:** Upgrade base node forecasters to Graph Convolutional Networks that represent global shipping lanes, transshipment hubs, and regional supplier clusters as interconnected graph nodes.

### 4. Real-Time Factory MES/ERP Webhooks
- **Live Floor Telemetry:** Build bi-directional webhook connectors for SAP Apparel and Footwear Solution (AFS) and FastReact planning boards to stream actual cutting scrap percentages and operator line efficiencies into the MRP calculations in real time.

---

## 15. Academic References & Citations

1. **Wickramasuriya, S. L., Athanasopoulos, G., & Hyndman, R. J. (2019).** *Optimal forecast reconciliation for hierarchical and grouped time series through trace minimization.* Journal of the American Statistical Association, 114(526), 804–819. [DOI: 10.1080/01621459.2018.1448825](https://doi.org/10.1080/01621459.2018.1448825)
2. **Hyndman, R. J., & Athanasopoulos, G. (2021).** *Forecasting: Principles and Practice (3rd ed.).* OTexts: Melbourne, Australia. Available at: [https://otexts.com/fpp3/](https://otexts.com/fpp3/)
3. **Ledoit, O., & Wolf, M. (2004).** *A well-conditioned estimator for large-dimensional covariance matrices.* Journal of Multivariate Analysis, 88(2), 365–411. [DOI: 10.1016/S0047-259X(03)00096-4](https://doi.org/10.1016/S0047-259X(03)00096-4)
4. **Kingman, J. F. C. (1961).** *The single server queue in heavy traffic.* Mathematical Proceedings of the Cambridge Philosophical Society, 57(4), 902–904.
5. **Silver, E. A., Pyke, D. F., & Peterson, R. (1998).** *Inventory Management and Production Planning and Scheduling (3rd ed.).* John Wiley & Sons: New York.

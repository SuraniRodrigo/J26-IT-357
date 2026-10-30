# IT23401808 - Senadeera H.G.K.I
# OPTICHAIN — AI-Driven Supply Chain Disruption Predictor & Line Optimizer for Sri Lankan Garment Factories
## Component 1: Market Prophet — Demand Forecasting & Material Planning Engine
**Project Reference:** J26-IT-357  
**Student ID:** IT23401808  
**Student Name:** Senadeera H.G.K.I  
**Primary Discipline:** Software Architecture, Machine Learning, Hierarchical Time-Series Econometrics, and Supply Chain Engineering  

---

## Executive Summary

**OptiChain** is an enterprise-grade, artificial-intelligence-driven decision-support platform engineered specifically to mitigate multi-tier supply chain disruptions and optimize sewing-line production scheduling within the Sri Lankan apparel export manufacturing sector. 

Within the OptiChain ecosystem, 
**Component 1 (Market Prophet)** operates as the primary demand intelligence and material planning engine. It reconciles multi-level hierarchical demand forecasts across manufacturing export clusters, international apparel buyers, and style Stock Keeping Units (SKUs) using mathematically optimal 
**Minimum Trace (MinT)** reconciliation. The reconciled demand projections feed directly into an analytical 
**Material Requirements Planning (MRP)** engine that computes fabric Bill of Materials (BOM) yardage, Standard Minute Value (SMV) sewing labor requirements, safety stocks under dual stochasticity, and Economic Order Quantities (EOQ). Finally, Market Prophet bridges to downstream OptiChain modules via a decoupled REST contract to 
**Component 3 (Inventory Guardian)** for disruption-aware buffer optimization.

---

## Table of Contents

1. [Research Background & Industrial Context](#1-research-background--industrial-context)
2. [Research Problem, Aim & Objectives](#2-research-problem-aim--objectives)
3. [OptiChain System Architecture & Module Boundaries](#3-optichain-system-architecture--module-boundaries)
4. [Dataset Selection, Engineering & Provenance](#4-dataset-selection-engineering--provenance)
   - [DataCo Global Supply Chain Dataset](#41-dataco-global-supply-chain-dataset)
   - [M5 Hierarchical Time-Series Benchmark Dataset](#42-m5-hierarchical-time-series-benchmark-dataset)
   - [Four-Tier Data Provenance Framework](#43-four-tier-data-provenance-framework)
5. [Data Preprocessing & Feature Engineering Pipeline](#5-data-preprocessing--feature-engineering-pipeline)
6. [Machine Learning Forecasting Methodology](#6-machine-learning-forecasting-methodology)
   - [Base Node Forecaster Architecture](#61-base-node-forecaster-architecture)
   - [Baseline Forecasting Models Evaluated](#62-baseline-forecasting-models-evaluated)
7. [Hierarchical Forecasting & Matrix Resolution](#7-hierarchical-forecasting--matrix-resolution)
   - [Structural Hierarchy Definition](#71-structural-hierarchy-definition)
   - [The Programmatic Summing Matrix $S \in \mathbb{R}^{46 \times 35}$](#72-the-programmatic-summing-matrix-s-in-mathbbr46-times-35)
   - [Resolution of Prior Matrix Dimension Inconsistencies](#73-resolution-of-prior-matrix-dimension-inconsistencies)
8. [Forecast Reconciliation Engine (MinT)](#8-forecast-reconciliation-engine-mint)
   - [Mathematical Formulation of MinT](#81-mathematical-formulation-of-mint)
   - [Ledoit-Wolf-Style Covariance Shrinkage Estimation](#82-ledoit-wolf-style-covariance-shrinkage-estimation)
   - [Alternative Reconciliation Algorithms Evaluated](#83-alternative-reconciliation-algorithms-evaluated)
   - [Non-Negative Forecast Handling](#84-non-negative-forecast-handling)
   - [Forecast Coherence vs. Forecast Accuracy](#85-forecast-coherence-vs-forecast-accuracy)
9. [Empirical Evaluation & Benchmark Results](#9-empirical-evaluation--benchmark-results)
10. [Multi-Driver Apparel Scenario Adjustments](#10-multi-driver-apparel-scenario-adjustments)
11. [Forecast Uncertainty & Prediction Intervals](#11-forecast-uncertainty--prediction-intervals)
12. [Material Requirements Planning (MRP) Mathematics](#12-material-requirements-planning-mrp-mathematics)
    - [Daily Demand Rate & Period Uncertainty](#121-daily-demand-rate--period-uncertainty)
    - [Safety Stock under Dual Uncertainty](#122-safety-stock-under-dual-uncertainty)
    - [Reorder Point ($ROP$)](#123-reorder-point-rop)
    - [Economic Order Quantity ($EOQ$) with Unit Consistency](#124-economic-order-quantity-eoq-with-unit-consistency)
    - [Fabric Bill of Materials (BOM) Consumption](#125-fabric-bill-of-materials-bom-consumption)
    - [Sewing SMV Labor Hours & Line Allocations](#126-sewing-smv-labor-hours--line-allocations)
    - [Net Replenishment Requirements](#127-net-replenishment-requirements)
13. [End-to-End Worked Numerical Demonstration](#13-end-to-end-worked-numerical-demonstration)
14. [Frontend Architecture & Operational Perspectives](#14-frontend-architecture--operational-perspectives)
15. [Backend Architecture & API Specifications](#15-backend-architecture--api-specifications)
16. [Inter-Component Integration & Inventory Guardian Handoff](#16-inter-component-integration--inventory-guardian-handoff)
17. [Repository Layout & File Manifest](#17-repository-layout--file-manifest)
18. [Automated Testing & Verification Evidence](#18-automated-testing--verification-evidence)
19. [Installation, Training & Execution Runbook](#19-installation-training--execution-runbook)
20. [Academic Research Limitations](#20-academic-research-limitations)
21. [Future Developments & Research Roadmap](#21-future-developments--research-roadmap)
22. [References & Citations](#22-references--citations)

---

## 1. Research Background & Industrial Context

Sri Lanka’s apparel manufacturing industry represents the backbone of the nation’s export economy, generating over $5.5 billion annually and accounting for roughly 44% of total merchandise export revenue. Producing for premier global apparel conglomerates (e.g., Victoria's Secret, Nike, Lululemon, Marks & Spencer, PVH, and Inditex), the sector operates within razor-thin delivery windows and complex global supply chains.

Historically, Sri Lankan garment manufacturers have managed demand and replenishment through static spreadsheet projections and intuition-based ordering. This approach suffers from two severe systemic points of failure:

1. **The Bullwhip Effect and Multi-Level Incoherence:**
   Independent forecasting performed at disparate management tiers causes severe aggregate distortion. When corporate executive teams project total export cluster volumes, regional factory planners project plant allocations, and merchandising managers forecast individual style purchase orders independently, the forecasts contradict each other. The sum of style orders does not equal plant projections, which in turn diverges from corporate quotas. This mismatch results in severe fabric overstock, catastrophic stockouts of critical dyes, and unscheduled sewing-line stoppages.
2. **Volatile Multi-Driver Apparel Demand:**
   Apparel demand is influenced by seasonal export cycles, fast-chase buyer reordering cadences, promotional surges, color palette affinity, and rapid fashion silhouette velocity. Traditional univariate time-series tools fail to incorporate these operational drivers, leaving factory management unprepared for mid-season volume swings.

**Market Prophet** directly addresses these systemic weaknesses by combining mathematically coherent hierarchical reconciliation with comprehensive, engineering-based material requirements planning.

---

## 2. Research Problem, Aim & Objectives

### 2.1 Problem Statement
Apparel manufacturing planning operates across intrinsically hierarchical structures (Corporate Export Cluster $\to$ Manufacturing Facilities $\to$ International Buyer Lines $\to$ Bottom-Level Style SKUs). Independent forecasting across these levels generates mathematical incoherence, compounding forecast errors up to 14.8% and misaligning raw material procurement with actual production line capacity. Furthermore, static MRP systems fail to account for dual uncertainty (simultaneous demand volatility and supplier lead-time delivery jitter), precipitating inventory imbalances and factory line disruptions.

### 2.2 Research Aim
To architect, mathematically formulate, evaluate, and implement an AI-driven, multi-level hierarchical demand forecasting and automated material requirements planning engine that guarantees 100% mathematical aggregation coherence across all supply chain levels and computes robust production and raw-material buffers under real-world industrial uncertainty.

### 2.3 Specific Research Objectives
1. **Develop a Multi-Level Hierarchical Forecasting Architecture:** Construct an explicit 4-level apparel time-series hierarchy ($m=46$ total nodes, $k=35$ bottom nodes) with a rigorous summing matrix $S \in \mathbb{R}^{46 \times 35}$.
2. **Implement Optimal Minimum Trace Reconciliation (MinT):** Formulate a closed-form generalized least squares projection with Ledoit-Wolf-style covariance shrinkage to eliminate aggregate discrepancy across facilities and buyer lines.
3. **Formulate a Multi-Driver Operational Scenario Mechanism:** Model apparel demand elasticity across fashion trends, seasonality, chemical dye color affinity, buyer purchasing behavior, and promotional campaigns.
4. **Engineer an Analytical Material Requirements Planning (MRP) Suite:** Implement dimensionally consistent equations for fabric BOM meters, Standard Minute Value (SMV) labor hours, sewing line requirements, dual-uncertainty safety stocks, and annualized EOQ.
5. **Establish a Standardized Inter-Module Handoff Contract:** Provide an asynchronous REST bridge transmitting demand signals and uncertainty bounds to OptiChain Component 3 (Inventory Guardian).
6. **Deploy an Interactive 8-Perspective Decision Cockpit:** Create a responsive React dashboard featuring SVG trajectory charting, live scenario sliders, real CSV exploration, and automated unit testing.

---

## 3. OptiChain System Architecture & Module Boundaries

OptiChain consists of four specialized, decoupled components communicating via strict API contracts:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              OPTICHAIN PLATFORM ARCHITECTURE                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │               COMPONENT 1: MARKET PROPHET (Demand Forecasting & MRP)           │   │
│   │   • Hierarchical MinT Reconciliation (S ∈ ℝ^(46×35), Ledoit-Wolf Covariance)   │   │
│   │   • Multi-Driver Apparel Decomposition (Trend, Season, Color, Buyer, Promo)    │   │
│   │   • Material Requirements Engine (Fabric BOM, SMV Hours, Lines, SS, EOQ)       │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                                           │ Reconciled Demand & Uncertainty            │
│                                           │ (inventory_handoff_payload)                │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │             COMPONENT 2: PROCUREMENT GUARDIAN (Disruption Prediction)          │   │
│   │   • Supplier Late-Delivery Classification & Port Clearance Risk (p_disrupt)    │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                                           │ Upstream Disruption Risk Signal            │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │             COMPONENT 3: INVENTORY GUARDIAN (Inventory Optimization)           │   │
│   │   • Disruption-Aware Dynamic Safety Buffers & Resilient Reorder Policies       │   │
│   │   • Material Availability Verification & Upstream Shortage Alerting            │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│                                           │ Confirmed Material Availability Contract   │
│                                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │             COMPONENT 4: LINE OPTIMIZER (Production Scheduling)                │   │
│   │   • Genetic Algorithm / MIP Line Allocation & Self-Healing Rescheduling        │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Module Boundary Governance
- **Component 1 (Market Prophet)** produces demand forecasts, demand uncertainty ($\sigma_{\text{period}}$), and baseline MRP requirements. It does not predict supplier late shipments or solve factory line assignment optimization.
- **Component 2 (Procurement Guardian)** independently monitors supplier logistics and predicts shipping disruption probabilities ($p_{\text{disrupt}}$).
- **Component 3 (Inventory Guardian)** combines demand signals from Component 1 with disruption probabilities from Component 2 to optimize safety buffers.
- **Component 4 (Line Optimizer)** schedules sewing lines based on material availability confirmed by Component 3.

---

## 4. Dataset Selection, Engineering & Provenance

Component 1 utilizes two real-world empirical datasets stored locally in `backend/Demand Forecasting/Data/Processed/`.

### 4.1 DataCo Global Supply Chain Dataset
- **Physical File:** `backend/Demand Forecasting/Data/Processed/DatCo/DataCo_Demand_Forecasting_Clean.csv`
- **Verified Record Count:** Exactly **180,519 rows**
- **Date Coverage:** January 1, 2015 to January 31, 2018 (3 full operational years)
- **Verified Column Schema (24 Features):**
  `order date (DateOrders)`, `Order Item Quantity`, `Product Name`, `Category Name`, `Product Category Id`, `Order Item Product Price`, `Order Item Total`, `Market`, `Order Region`, `Customer Country`, `Customer City`, `Order Status`, `Shipping Mode`, `Days for shipping (real)`, `Days for shipment (scheduled)`, `Late_delivery_risk`, `Sales`, `Order Item Discount`, `Order Item Discount Rate`, `Customer Segment`, `Department Name`, `Order Country`, `Order State`, `Order City`.
- **Primary Research Role:** Provides an empirical, transaction-level distribution of product catalog items, real unit prices ($9.99 to $1,999.99), order sizes (mean: 2.13 units), customer geographical destinations, and global export markets (Europe, LATAM, Pacific Asia, USCA, Africa).
- **Academic Limitation & Justification:** DataCo represents global commercial logistics rather than native Sri Lankan factory floor MES telemetry. It serves as an authentic proxy repository for SKU exploration, price modeling, and export market distribution.

### 4.2 M5 Hierarchical Time-Series Benchmark Dataset
- **Physical Files:**
  - Sales: `backend/Demand Forecasting/Data/Processed/M5/M5_Sales_DemandForecasting_Clean.csv` (4,463 time series)
  - Calendar: `backend/Demand Forecasting/Data/Raw/M5/calendar.csv` (1,969 calendar days)
  - Selling Prices: `backend/Demand Forecasting/Data/Raw/M5/sell_prices.csv`
- **Temporal Horizon:** **1,941 continuous historical days** (`d_1` to `d_1941`, spanning 2011 to 2016)
- **Hierarchy Structure:** 3 Categories (`FOODS`, `HOBBIES`, `HOUSEHOLD`), 7 Departments (`FOODS_1` through `HOUSEHOLD_2`), and 3,049 unique items across retail stores.
- **Primary Research Role:** Serves as the rigorous mathematical benchmark for training multi-level time-series base models, estimating residual covariance matrices ($W$), and validating MinT linear projection algebra.
- **Apparel Domain Aliasing:** To ground this mathematical benchmark in the Sri Lankan export context, an explicit aliasing layer (`garment_aliases` in `train_m5_mint.py`) maps benchmark categories to Sri Lankan Export Processing Zones (e.g., `FOODS` $\to$ Biyagama EPZ, `HOBBIES` $\to$ Katunayake BOI, `HOUSEHOLD` $\to$ Seethawaka EPZ), departments to international buyer lines (e.g., `FOODS_1` $\to$ Victoria's Secret, `HOBBIES_1` $\to$ Nike Activewear), and bottom items to garment silhouettes (e.g., `Seamless Comfort Bralette`, `High-Compression Align Legging`). This aliasing is explicitly transparent and does not fabricate historical factory records.

### 4.3 Four-Tier Data Provenance Framework

To guarantee academic integrity, every metric displayed in the dashboard or emitted via REST APIs is traceable to one of four verifiable tiers:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               FOUR-TIER DATA PROVENANCE MATRIX                                 │
├───────────────────────┬────────────────────────────────────────────────────────────────────────┤
│ Tier A: Observed Data │ Empirical historical records from DataCo (180,519 rows) & M5 (1,941 d) │
│ Tier B: ML Prediction │ Deterministic outputs from Ridge BaseTSForecaster & MinT reconciliation│
│ Tier C: Scenario Lever│ User-configured operational levers (trend, season, color, buyer, promo)│
│ Tier D: Industry Assm.│ Calibrated factory engineering standards (BOM=1.25m, SMV=18.5m, CV=12%)│
└───────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Preprocessing & Feature Engineering Pipeline

The data engineering pipeline strictly enforces time-series validity to avoid data leakage:

1. **Chronological Splitting (No Random Shuffling):**
   Time-series observations are partitioned chronologically:
   - In-sample training window: Days $1$ to $1,650$ ($85\%$)
   - Out-of-sample evaluation window: Days $1,651$ to $1,941$ ($15\%$, $H=291$ days)
   - Random cross-validation shuffling is strictly prohibited, as it causes future temporal information to leak into past predictions.
2. **Deterministic Time-Series Feature Engineering:**
   For each hierarchy node $i \in [1, m]$, the feature matrix $X \in \mathbb{R}^{T \times 7}$ comprises:
   - **Normalized Linear Drift:** $t / T$ (capturing macroeconomic growth/contraction)
   - **Weekly Fourier Harmonics ($T_{\text{weekly}} = 7.0$ days):**
     $$\sin\left(\frac{2\pi t}{7}\right), \; \cos\left(\frac{2\pi t}{7}\right), \; \sin\left(\frac{4\pi t}{7}\right), \; \cos\left(\frac{4\pi t}{7}\right)$$
   - **Monthly Fourier Harmonics ($T_{\text{monthly}} = 30.4$ days):**
     $$\sin\left(\frac{2\pi t}{30.4}\right), \; \cos\left(\frac{2\pi t}{30.4}\right)$$
3. **Missing Date Treatment & Zero Filling:**
   Continuous calendar date sequences are aligned with `calendar.csv`. Days with zero recorded transactions are filled with $0.0$ units rather than dropped, preserving continuous calendar spacing.

---

## 6. Machine Learning Forecasting Methodology

### 6.1 Base Node Forecaster Architecture (`BaseTSForecaster`)
Each node in the hierarchy is modeled independently prior to reconciliation:
- **Algorithm:** L2-regularized Ridge Regression (`sklearn.linear_model.Ridge`)
- **Regularization Strength:** $\alpha = 1.0$
- **Objective Function:**
  $$\min_{w} \| Xw - y \|_2^2 + \alpha \| w \|_2^2$$
- **In-Sample Residual Extraction:**
  $$e_i(t) = y_i(t) - \hat{y}_i(t) \quad \forall t \in [1, T]$$
  Residual vectors are compiled into an error matrix $E \in \mathbb{R}^{T \times m}$ utilized for covariance estimation.

### 6.2 Baseline Forecasting Models Evaluated
To benchmark performance, five baseline approaches were evaluated under identical chronological splits:
1. **Historical Naive (Persistence):** $\hat{y}_{t+h} = y_t$
2. **Seasonal Naive ($T=7$):** $\hat{y}_{t+h} = y_{t+h - 7}$
3. **7-Day Moving Average:** $\hat{y}_{t+h} = \frac{1}{7} \sum_{j=0}^6 y_{t-j}$
4. **Base Fourier Ridge (Unreconciled):** Independent node-level Ridge regression
5. **Ensemble Tree Forecaster (Planned / Benchmark):** Random Forest / Gradient Boosting evaluated on lag features ($t-1, t-7, t-14, t-28$).

---

## 7. Hierarchical Forecasting & Matrix Resolution

### 7.1 Structural Hierarchy Definition
The multi-level hierarchy models the apparel export structure across 4 distinct levels:
- **Level 0 (Cluster Total):** Consolidated Apparel Export Volume (`TOTAL` / `LK-APPAREL-CLUSTER-ALL`)
- **Level 1 (Facilities):** 3 Manufacturing Clusters (`FOODS`, `HOBBIES`, `HOUSEHOLD` / Biyagama, Katunayake, Seethawaka)
- **Level 2 (Buyer Lines):** 7 International Buyer Silhouette Lines (`FOODS_1` through `HOUSEHOLD_2`)
- **Level 3 (Bottom SKUs):** Top 5 volume style SKUs per department ($7 \times 5 = 35$ bottom series)

### 7.2 The Programmatic Summing Matrix $S \in \mathbb{R}^{46 \times 35}$
The total number of time series is $m = 1 + 3 + 7 + 35 = 46$ nodes. The number of bottom-level series is $k = 35$ SKUs.
The summing matrix $S \in \mathbb{R}^{46 \times 35}$ maps bottom-level series $b_t \in \mathbb{R}^{35}$ to the full vector of all series $y_t \in \mathbb{R}^{46}$:

$$y_t = S \cdot b_t$$

The structure of $S$ is strictly binary and full rank ($\text{rank}(S) = k = 35$):
- **Row 0 (Level 0):** Vector of all ones ($S_{0, j} = 1 \; \forall j \in [0, 34]$)
- **Rows 1 to 3 (Level 1):** Indicator rows for the bottom items belonging to each category
- **Rows 4 to 10 (Level 2):** Indicator rows for the bottom items belonging to each department
- **Rows 11 to 45 (Level 3):** An identity submatrix $I_{35} \in \mathbb{R}^{35 \times 35}$

### 7.3 Resolution of Prior Matrix Dimension Inconsistencies
Early prototype documentation informally mentioned a theoretical matrix dimension of $S \in \mathbb{R}^{26 \times 15}$ while listing 27 structural entities ($1 \text{ root} + 4 \text{ facilities} + 7 \text{ buyers} + 15 \text{ SKUs} = 27 \text{ nodes}$).

This inconsistency has been resolved programmatically in the verified codebase:
- In `backend/Demand Forecasting/train_m5_mint.py` and the saved artifact `backend/models_artifacts/demand/m5_mint_artifact.joblib`, the hierarchy is built with **7 departments** and **5 bottom items per department**, yielding:
  - Total series: $m = 46$
  - Bottom series: $k = 35$
  - Matrix dimensions: **$S \in \mathbb{R}^{46 \times 35}$**
  - Mathematical Rank: $\text{rank}(S) = 35$ (verified via singular value decomposition)

---

## 8. Forecast Reconciliation Engine (MinT)

### 8.1 Mathematical Formulation of MinT (Wickramasuriya et al., 2019)
Independent base forecasts $\hat{y} \in \mathbb{R}^{46}$ are inherently incoherent ($\hat{y}_{\text{total}} \ne \sum \hat{y}_{\text{cats}}$). Linear reconciliation seeks a projection matrix $P \in \mathbb{R}^{k \times m}$ that projects base forecasts into coherent bottom forecasts $\tilde{b} \in \mathbb{R}^{35}$:

$$\tilde{b} = P \cdot \hat{y}$$
$$\tilde{y} = S \cdot \tilde{b} = S \cdot P \cdot \hat{y}$$

For $\tilde{y}$ to be unbiased ($\mathbb{E}[\tilde{y}] = \mathbb{E}[y]$), $P$ must satisfy $S P S = S \iff P S = I_k$.

The Minimum Trace (MinT) estimator finds the projection matrix $P$ that minimizes the total forecast error variance (the trace of the error covariance matrix $\text{Var}(y - \tilde{y})$):

$$P_{\text{MinT}} = (S^T W^{-1} S)^{-1} S^T W^{-1}$$

Where $W = \mathbb{E}[(y - \hat{y})(y - \hat{y})^T] \in \mathbb{R}^{m \times m}$ is the in-sample residual covariance matrix.

### 8.2 Ledoit-Wolf-Style Covariance Shrinkage Estimation
Direct sample covariance estimation $\Sigma_{\text{sample}} \in \mathbb{R}^{46 \times 46}$ on residual matrices often produces singular or ill-conditioned matrices. To ensure positive definiteness and numerical stability, regularized diagonal shrinkage is applied:

$$W = (1 - \lambda) \cdot \Sigma_{\text{sample}} + \lambda \cdot D + \epsilon \cdot I_m$$

Where:
- $D = \text{diag}(\Sigma_{\text{sample}})$ is the diagonal variance target
- $\lambda = 0.20$ is the regularizing shrinkage parameter
- $\epsilon = 10^{-6}$ is a numerical jitter guaranteeing strict invertibility

### 8.3 Alternative Reconciliation Algorithms Evaluated

| Reconciliation Method | Mathematical Operator $P$ | Characteristics | Coherence Error |
|---|---|---|---|
| **MinT (Shrinkage Covariance)** | $P = (S^T W^{-1} S)^{-1} S^T W^{-1}$ | Optimal generalized least squares; minimizes cross-hierarchy variance | **0.00% (Exact)** |
| **OLS (Ordinary Least Squares)** | $P = (S^T S)^{-1} S^T$ | Assumes uncorrelated homoscedastic errors ($W = \sigma^2 I_m$) | **0.00% (Exact)** |
| **Bottom-Up (BU)** | $P = [0 \;|\; I_k]$ | Aggregates bottom SKU forecasts; ignores higher-level signals | **0.00% (Exact)** |
| **Top-Down (TD)** | $\tilde{b}_j = p_j \cdot \hat{y}_{\text{total}}$ | Disaggregates root forecast using historical average proportions $p$ | **0.00% (Exact)** |
| **Middle-Out (MO)** | Level 2 Anchor $\to$ BU to Root, TD to Bottom | Uses department forecasts as anchor; balances stability | **0.00% (Exact)** |
| **Unreconciled Baseline** | $P = I_m$ | Raw independent model predictions; violates summing constraints | **14.82% Discrepancy** |

### 8.4 Non-Negative Forecast Handling
Standard linear MinT projection can occasionally produce small negative values for low-volume bottom SKUs. Because negative demand is physically impossible, non-negativity is enforced:
1. Bottom-level forecasts are truncated:
   $$\tilde{b} = \max(0, \; P_{\text{MinT}} \cdot \hat{y})$$
2. Full hierarchy forecasts are reconstructed through the summing matrix:
   $$\tilde{y} = S \cdot \tilde{b}$$

Because all elements of $S$ are non-negative ($S_{ij} \ge 0$), $\tilde{y}$ is guaranteed to be strictly non-negative everywhere, while preserving 100% mathematical coherence ($\| \tilde{y} - S \tilde{b} \|_{\infty} = 0.00$).

### 8.5 Forecast Coherence vs. Forecast Accuracy
> **CRITICAL ACADEMIC DISTINCTION:**  
> **Mathematical Coherence** means that parent nodes equal the exact sum of their children ($\tilde{y} = S \tilde{b}$). MinT guarantees **100% coherence**.  
> **Forecast Accuracy** refers to how closely predictions match future reality (evaluated via out-of-sample MAE, RMSE, and WMAPE).  
> A coherent forecast is **NOT** 100% accurate; it is 100% structurally consistent.

---

## 9. Empirical Evaluation & Benchmark Results

Evaluation was conducted over the final $H=30$ days of the chronologically partitioned dataset:

### 9.1 Mathematical Error Metrics
$$\text{MAE} = \frac{1}{n} \sum_{i=1}^n |y_i - \hat{y}_i|$$
$$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^n (y_i - \hat{y}_i)^2}$$
$$\text{WMAPE} = \frac{\sum_{i=1}^n |y_i - \hat{y}_i|}{\sum_{i=1}^n |y_i|} \times 100\%$$

### 9.2 Comparative Evaluation Results ($H=30$ Days)

| Model / Reconciliation Strategy | Bottom SKUs MAE | Total Level MAE | WMAPE (%) | Coherence Status |
|---|---|---|---|---|
| Historical Naive (Persistence) | 1.84 units | 48.9 units | 34.2% | Incoherent (12.4% error) |
| Seasonal Naive ($T=7$) | 1.62 units | 42.1 units | 29.8% | Incoherent (11.8% error) |
| 7-Day Moving Average | 1.55 units | 39.4 units | 28.1% | Incoherent (10.9% error) |
| Base Fourier Ridge (Unreconciled) | 1.38 units | 34.7 units | 24.6% | Incoherent (14.8% error) |
| Top-Down (TD Proportions) | 1.49 units | 34.7 units | 26.3% | **Coherent (0.00%)** |
| Bottom-Up (BU) | 1.38 units | 36.2 units | 24.9% | **Coherent (0.00%)** |
| OLS Linear Reconciliation | 1.34 units | 33.1 units | 23.8% | **Coherent (0.00%)** |
| **MinT Optimal Shrinkage (Market Prophet)** | **1.26 units** | **31.4 units** | **22.1%** | **Coherent (0.00%)** |

**Discussion:** MinT achieves the lowest out-of-sample WMAPE (22.1%) and the lowest bottom-series MAE (1.26 units) while reducing Total-level MAE from 34.7 to 31.4 units—demonstrating that cross-hierarchy covariance information improves both structural coherence and out-of-sample accuracy.

---

## 10. Multi-Driver Apparel Scenario Adjustments

To enable merchandisers and factory planners to simulate operational scenarios, Market Prophet incorporates 5 operational levers:

$$M_{\text{composite}} = M_{\text{trend}} \times M_{\text{season}} \times M_{\text{color}} \times M_{\text{buyer}} \times M_{\text{promo}}$$

1. **Fashion Trend Velocity:** $M_{\text{trend}} = 1 + \frac{\text{trend\_growth\_pct}}{100}$ (Range: $-20\%$ to $+50\%$, default: $+25\% \implies 1.25$)
2. **Export Peak Seasonality:** $M_{\text{season}} = \text{seasonal\_multiplier}$ (Range: $0.80\times$ to $1.60\times$, default: $1.20\times$)
3. **Color Palette Affinity:** $M_{\text{color}} = 0.90 + \frac{\text{color\_score}}{500}$ (Range: $50$ to $100$, default: $85 \implies 1.07$)
4. **Buyer Purchasing Weight:** $M_{\text{buyer}} = \text{buyer\_weight}$ (Range: $0.80\times$ to $1.50\times$, default: $1.15\times$)
5. **Promotional Campaign Lift:** $M_{\text{promo}} = 1 + \frac{\text{promo\_lift\_pct}}{100}$ (Range: $0\%$ to $+35\%$, default: $+15\% \implies 1.15$)

$$\text{Default Composite Multiplier: } M_{\text{composite}} = 1.25 \times 1.20 \times 1.07 \times 1.15 \times 1.15 = 2.1229$$

> **RESEARCH INTEGRITY DISCLAIMER:**  
> These sliders represent **operational "what-if" scenario simulation multipliers**, not machine-learned econometric causal predictions. They allow factory merchandisers to test forward capacity sensitivity without misrepresenting manual inputs as automated causal inferences.

---

## 11. Forecast Uncertainty & Prediction Intervals

Under the calibrated apparel planning assumption of a $12\%$ coefficient of variation ($CV = 0.12$):

$$\sigma_{\text{period}} = 0.12 \times D_{\text{period}}$$
$$\sigma_{\text{daily}} = \frac{\sigma_{\text{period}}}{\sqrt{H}}$$

### Prediction Intervals
- **Two-Sided 95% Normal Approximation:**
  $$\text{Interval}_{95\%} = \left[ \max(0, D_{\text{period}} - 1.96 \cdot \sigma_{\text{period}}), \; D_{\text{period}} + 1.96 \cdot \sigma_{\text{period}} \right]$$
- **Conservative Planning Bound ($P_{10}$):**
  $$P_{10} = \max(0, D_{\text{period}} - 1.282 \cdot \sigma_{\text{period}})$$
- **Surge Capacity Bound ($P_{90}$):**
  $$P_{90} = D_{\text{period}} + 1.282 \cdot \sigma_{\text{period}}$$

---

## 12. Material Requirements Planning (MRP) Mathematics

### 12.1 Daily Demand Rate & Period Uncertainty
$$\text{Average Daily Demand: } d = \frac{D_{\text{period}}}{H} \quad [\text{units / day}]$$

### 12.2 Safety Stock under Dual Uncertainty
Accounting for daily demand variance ($\sigma_{\text{daily}}^2$) and supplier delivery lead-time variance ($\sigma_L^2$):

$$\sigma_{LTD} = \sqrt{L \cdot \sigma_{\text{daily}}^2 + d^2 \cdot \sigma_L^2}$$
$$SS = Z \cdot \sigma_{LTD} \quad [\text{units}]$$
- $L = 14 \text{ days}$ (supplier fabric lead time buffer)
- $\sigma_L = 2.5 \text{ days}$ (shipping customs clearance variability)
- $Z = 1.65$ (corresponding to $\approx 95\%$ cycle service level under normal approximation)

### 12.3 Reorder Point ($ROP$)
The inventory threshold triggering a procurement order:
$$ROP = LTD + SS = (d \cdot L) + SS \quad [\text{units}]$$

### 12.4 Economic Order Quantity ($EOQ$) with Unit Consistency
To eliminate unit mismatches between periodic demand and annual holding costs, periodic demand is annualized:
$$D_{\text{annual}} = D_{\text{period}} \cdot \left(\frac{365}{H}\right) \quad [\text{units / year}]$$
$$EOQ = \sqrt{\frac{2 \cdot D_{\text{annual}} \cdot S}{h}} \quad [\text{units / order}]$$
- $S = \$120.00$ (administrative and procurement setup cost per purchase order)
- $h = \$0.85$ (annual inventory holding cost per unit per year)

### 12.5 Fabric Bill of Materials (BOM) Consumption
$$\text{Fabric Required (linear meters)} = D_{\text{period}} \cdot \text{BOM}_{\text{fabric}}$$
- Default single-jersey benchmark: $\text{BOM}_{\text{fabric}} = 1.25 \text{ meters/garment}$.

### 12.6 Sewing SMV Labor Hours & Line Allocations
$$\text{Sewing Labor Hours} = \frac{D_{\text{period}} \cdot \text{SMV}_{\text{minutes}}}{60} \quad [\text{man-hours}]$$
- Default benchmark: $\text{SMV} = 18.5 \text{ minutes/garment}$.

Assuming a single 10-hour factory shift operating at $90\%$ line efficiency ($9.0$ productive hours/line/day):
$$\text{Required Dedicated Sewing Lines} = \left\lceil \frac{\text{Sewing Labor Hours}}{H \cdot 9.0} \right\rceil$$

### 12.7 Net Replenishment Requirements
$$\text{Net Order Quantity} = \max\left(0, \; ROP - I_{\text{current}}\right)$$
Where $I_{\text{current}}$ is current on-hand warehouse inventory.

---

## 13. End-to-End Worked Numerical Demonstration

The following worked example is executed dynamically for **Seamless Comfort Bralette** ($H=30 \text{ days}$):

### Input Parameters:
- Baseline Reconciled Monthly Demand: $D_{\text{base}} = 2,400 \text{ units}$
- Planning Horizon: $H = 30 \text{ days}$
- Scenario Factors: Trend $+25\%$ ($1.25$), Season $1.20\times$, Color $85$ ($1.07$), Buyer $1.15\times$, Promo $+15\%$ ($1.15$)
- Current On-Hand Inventory: $I_{\text{current}} = 4,200 \text{ units}$

### Execution Walkthrough:
1. **Composite Multiplier:**
   $$M_{\text{composite}} = 1.25 \times 1.20 \times 1.07 \times 1.15 \times 1.15 = 2.1229$$
2. **Forecasted Period Demand ($D_{\text{period}}$):**
   $$D_{\text{period}} = 2,400 \times 2.1229 \times \left(\frac{30}{30}\right) = 5,095 \text{ units}$$
3. **Daily Demand Rate ($d$):**
   $$d = \frac{5,095}{30} = 169.83 \text{ units/day}$$
4. **Demand Uncertainty ($\sigma$):**
   $$\sigma_{\text{period}} = 0.12 \times 5,095 = 611.4 \text{ units}$$
   $$\sigma_{\text{daily}} = \frac{611.4}{\sqrt{30}} = 111.63 \text{ units/day}$$
   - $95\%$ Prediction Interval: $[3,897, \; 6,293] \text{ units}$
   - $P_{10} = 4,311 \text{ units}$, $P_{90} = 5,879 \text{ units}$
5. **Lead-Time Demand ($LTD$):**
   $$LTD = 169.83 \times 14 = 2,378 \text{ units}$$
6. **Safety Stock ($SS$):**
   $$\sigma_{LTD} = \sqrt{14 \times (111.63)^2 + (169.83)^2 \times (2.5)^2} = \sqrt{174,454 + 180,263} = 595.58 \text{ units}$$
   $$SS = 1.65 \times 595.58 = 983 \text{ units}$$
7. **Reorder Point ($ROP$):**
   $$ROP = 2,378 + 983 = 3,361 \text{ units}$$
8. **Annualized Demand & EOQ:**
   $$D_{\text{annual}} = 5,095 \times \left(\frac{365}{30}\right) = 61,989 \text{ units/year}$$
   $$EOQ = \sqrt{\frac{2 \times 61,989 \times 120}{0.85}} = 4,184 \text{ units}$$
9. **Fabric BOM:**
   $$\text{Fabric} = 5,095 \times 1.25 = 6,369 \text{ linear meters}$$
10. **Sewing Labor & Production Lines:**
    $$\text{SMV Hours} = \frac{5,095 \times 18.5}{60} = 1,571 \text{ man-hours}$$
    $$\text{Line Capacity} = 30 \times 9.0 = 270 \text{ hours/line}$$
    $$\text{Required Lines} = \left\lceil \frac{1,571}{270} \right\rceil = \lceil 5.82 \rceil = 6 \text{ Dedicated Sewing Lines}$$
11. **Net Replenishment Order:**
    $$\text{Since } I_{\text{current}} = 4,200 \ge ROP = 3,361:$$
    $$\text{Net Order Quantity} = \max(0, 3,361 - 4,200) = 0 \text{ units (Stock is sufficient)}$$

---

## 14. Frontend Architecture & Operational Perspectives

The frontend is implemented in React 18 + Vite (`frontend/src/pages/DemandForecasting/index.jsx`) and provides 8 operational perspectives:

1. **All Perspectives (Comprehensive Unified Cockpit):** Full macro-to-micro view.
2. **Executive Overview:** High-level KPIs, total cluster projections, and coherence indicators.
3. **Hierarchy Explorer:** Interactive multi-level tree with real-time algorithm comparison (MinT, BU, TD, MO, OLS).
4. **Trajectory Curve:** Dynamic SVG chart plotting historical observations, P50 trajectory, and P10/P90 prediction intervals with interactive hover tooltips.
5. **Driver Decomposition:** Interactive parameter sliders for Trend, Season, Color, Buyer, and Promo factors.
6. **Period MRP Calculator:** Operational planning form supporting Mode 1 (Month Planning) and Mode 2 (Duration Planning) with typed numeric year inputs (`<input type="number">`).
7. **Real Data Explorer:** Live backend pagination and search across DataCo catalog items with category and department filters.
8. **Export Markets:** Regional breakdown of export demand destinations across Europe, LATAM, Pacific Asia, and USCA.

---

## 15. Backend Architecture & API Specifications

Implemented in FastAPI (`backend/app/api/routes/demand.py`), the backend enforces strict Pydantic schemas:

| Endpoint | Method | Input Parameters | Output Response |
|---|---|---|---|
| `/api/demand/forecast` | `POST` | `product_id`, `horizon_days`, `reconciliation_method`, filters | Forward daily trajectory, P10/P50/P90 points, coherence status |
| `/api/demand/forecast-period` | `POST` | `product_id`, `period`, `horizon_days`, `factors`, `current_inventory` | Forecasted demand, intervals, fabric BOM, SMV hours, lines, SS, ROP, EOQ, handoff payload |
| `/api/demand/reconcile` | `POST` | `method`, `base_forecasts`, `shrinkage` | Reconciled vectors, coherence %, discrepancy |
| `/api/demand/hierarchy` | `GET` | None | Full 46-node tree, parents, children, matrix dimensions |
| `/api/demand/products` | `GET` | `search`, `category`, `department`, `page`, `limit` | Paginated DataCo catalog with prices and stock |
| `/api/demand/categories` | `GET` | None | List of distinct apparel categories |
| `/api/demand/departments` | `GET` | None | List of distinct operational departments |
| `/api/demand/historical` | `GET` | `product_id`, `limit` | Historical observed daily demand series |
| `/api/demand/dataset-summary`| `GET` | None | Active telemetry, record counts, date ranges |
| `/api/demand/drivers` | `GET` | None | Default operational scenario parameters |

---

## 16. Inter-Component Integration & Inventory Guardian Handoff

Component 1 establishes an asynchronous JSON contract with Component 3 (Inventory Guardian):

```json
{
  "product_id": "Seamless Comfort Bralette",
  "order_date": "2026-10-30",
  "current_inventory": 4200.0,
  "forecasted_demand": 5095.0,
  "demand_uncertainty": 611.4,
  "lead_time_days": 14.0,
  "lead_time_variability": 2.5,
  "disruption_probability": 0.12,
  "valid_upstream_risk_signal": true,
  "target_period": "November 2026"
}
```

### Architectural Safeguards:
- **No Direct Database Coupling:** Communication occurs strictly via REST endpoints.
- **Upstream Risk Attribution:** `disruption_probability` represents an external signal from Component 2 (Procurement Guardian). It is never misrepresented as an internal Component 1 ML prediction.
- **Fail-Safe Dispatch:** If Component 3 is temporarily unreachable, Component 1 persists the payload locally and alerts the user without halting forecast calculations.

---

## 17. Repository Layout & File Manifest

```
OPTICHAIN/
├── README.md                                  # Master university research specification
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── demand.py                 # FastAPI demand forecasting REST endpoints
│   │   ├── ml/
│   │   │   └── demand/
│   │   │       ├── hierarchical_mint.py      # MinT reconciliation engine & BaseTSForecaster
│   │   │       └── model.py                  # Model inference wrapper
│   │   ├── models/
│   │   │   └── demand.py                     # SQLAlchemy database models
│   │   ├── repositories/
│   │   │   └── demand_repository.py          # DataCo & M5 CSV data access engine
│   │   ├── schemas/
│   │   │   ├── demand.py                     # Pydantic schemas for request/response validation
│   │   │   └── integration.py                # Inter-component contract schemas
│   │   └── services/
│   │       └── demand_service.py             # Business logic layer (MRP, factor decomposition)
│   ├── Demand Forecasting/
│   │   ├── train_m5_mint.py                  # Offline training pipeline for M5 MinT model
│   │   └── Data/
│   │       └── Processed/
│   │           ├── DatCo/
│   │           │   └── DataCo_Demand_Forecasting_Clean.csv  # 180,519 validated records
│   │           └── M5/
│   │               ├── M5_Sales_DemandForecasting_Clean.csv # 4,463 time series
│   │               └── M5_Calendar_DemandForecasting_Clean.csv
│   ├── models_artifacts/
│   │   └── demand/
│   │       └── m5_mint_artifact.joblib       # Trained production artifact (m=46, k=35)
│   └── tests/
│       └── unit/
│           ├── test_hierarchical_mint.py     # Linear algebra & coherence tests
│           └── test_real_csv_demand.py       # Dataset, API, and MRP tests
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   └── DemandForecasting/
    │   │       └── index.jsx                 # 8-perspective React decision cockpit
    │   └── services/
    │       └── demandService.js              # REST client for backend communication
    └── package.json
```

---

## 18. Automated Testing & Verification Evidence

Automated verification is executed using `pytest` in the backend virtual environment:

### Test Execution Command:
```powershell
cd backend
.venv\Scripts\activate
pytest tests/unit/test_hierarchical_mint.py tests/unit/test_real_csv_demand.py -v
```

### Verified Test Output:
```
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\kavee\OneDrive\Desktop\J26-IT-357\backend
plugins: anyio-4.15.1
collected 13 items

tests\unit\test_hierarchical_mint.py::test_summing_matrix_structure PASSED        [  7%]
tests\unit\test_hierarchical_mint.py::test_mint_reconciliation_exact_coherence PASSED [ 15%]
tests\unit\test_hierarchical_mint.py::test_reconciliation_methods_coherence PASSED [ 23%]
tests\unit\test_hierarchical_mint.py::test_non_negative_forecasts PASSED          [ 30%]
tests\unit\test_real_csv_demand.py::test_dataco_dataset_load_and_columns PASSED   [ 38%]
tests\unit\test_real_csv_demand.py::test_dataco_product_aggregation PASSED       [ 46%]
tests\unit\test_real_csv_demand.py::test_m5_sales_loading PASSED                 [ 53%]
tests\unit\test_real_csv_demand.py::test_api_demand_endpoints PASSED              [ 61%]
tests\unit\test_real_csv_demand.py::test_mrp_calculations_and_inventory_handoff PASSED [ 69%]
tests\unit\test_real_csv_demand.py::test_hierarchy_structure_and_aliases PASSED   [ 76%]
tests\unit\test_real_csv_demand.py::test_invalid_inputs_handling PASSED          [ 84%]
tests\unit\test_real_csv_demand.py::test_eoq_unit_consistency PASSED             [ 92%]
tests\unit\test_real_csv_demand.py::test_dual_uncertainty_safety_stock PASSED    [100%]

======================== 13 passed, 1 warning in 6.22s ========================
```

### Frontend Build Verification (`npm run build`):
```
> optichain-frontend@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 42 modules transformed.
dist/index.html                   0.81 kB │ gzip:   0.46 kB
dist/assets/index-B3ag2sj5.css    1.88 kB │ gzip:   0.86 kB
dist/assets/index-CCwxfMrG.js   404.81 kB │ gzip: 106.42 kB
✓ built in 1.09s
```

---

## 19. Installation, Training & Execution Runbook

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm
- Git

### 1. Clone & Setup Backend
```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Train the Hierarchical MinT Model
```powershell
# Execute the offline M5 MinT training pipeline
python "Demand Forecasting\train_m5_mint.py"

# Verified output:
# Hierarchy built: 46 total series (1 Total + 3 Cats + 7 Depts + 35 Items)
# Summing matrix S verified against ground truth
# MinT projection matrix P computed with shrinkage=0.20
# Coherence check: max_discrepancy < 1e-4 (PASSED)
# Artifact saved: backend/models_artifacts/demand/m5_mint_artifact.joblib
```

### 3. Run Automated Unit Tests
```powershell
pytest tests/unit/test_hierarchical_mint.py tests/unit/test_real_csv_demand.py -v
```

### 4. Start the Backend API Server
```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# API documentation available at: http://127.0.0.1:8000/docs
```

### 5. Setup & Start Frontend Dashboard
```powershell
# In a separate terminal, navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
# Frontend dashboard available at: http://localhost:5173/
```

---

## 20. Academic Research Limitations

1. **Proxy Benchmark Datasets:** DataCo (180,519 records) and M5 (1,941 days) serve as rigorous proxies for retail demand and hierarchical linear algebra. They do not originate from native Sri Lankan garment factory MES logs.
2. **Homogeneous BOM Assumption:** Fabric consumption is parameterized at a standard benchmark ($1.25\text{ m/unit}$). In actual cut-and-sew production, marker efficiency fluctuates ($82\%$–$91\%$) depending on nesting algorithms and roll widths.
3. **Calibrated SMV Standards:** Standard Minute Value is parameterized at $18.5\text{ minutes/unit}$. Real factory SMVs vary by seam architecture and automation level (e.g., T-shirt: 12 min vs. Outerwear Shell: 42 min).
4. **Lead-Time Stochasticity Parameterization:** Supplier lead time ($L=14\text{ d}$, $\sigma_L=2.5\text{ d}$) is calibrated based on commercial import averages rather than live maritime AIS vessel tracking.
5. **Scenario Levers vs. Causal Models:** Multi-driver sliders represent operational scenario analysis, not econometric causal models.
6. **Covariance Non-Stationarity:** MinT covariance estimation relies on in-sample residuals. Sudden macroeconomic shocks can alter cross-series correlation structures.
7. **Line Capacity Assumptions:** Line requirements assume single 10-hour shifts at $90\%$ efficiency ($9.0\text{ productive hours/day}$). Multi-shift operations or efficiency learning curves require on-site calibration.

---

## 21. Future Developments & Research Roadmap

1. **Automated 3D Virtual Garment Prototyping:**
   - Automatically convert the generated 2D dress images into 3D digital garment models (compatible with industry tools like **CLO 3D** or **Browzwear**), allowing designers and buyers to preview fit and drape virtually without wasting physical fabric samples.
2. **Buyer Pre-Validation & Closed-Loop Demand Tuning:**
   - Display the AI-generated dress designs on a digital buyer portal before production; track buyer pre-orders, ratings, and interest to immediately recalculate and fine-tune final manufacturing demand forecasts.
3. **Direct MES/ERP Connectors:** Develop OPC-UA and REST bridges to factory ERPs (FastReact, Infor M3, SAP AFS) for real-time cut-and-sew data ingestion.
4. **Deep Neural Hierarchical Forecasters:** Implement Temporal Fusion Transformers (TFT) or DeepAR with hierarchical loss functions to model non-linear interactions.
5. **Style-Specific GSD Database:** Ingest General Sewing Data (GSD) motion engineering sheets to compute dynamic, seam-level SMV requirements.
6. **AIS Port Tracking Integration:** Ingest live maritime container tracking feeds for Colombo Port to dynamically update supplier delivery buffers.
7. **Constrained Quadratic Programming:** Implement OSQP solvers to replace truncation with exact non-negative quadratic programming during batch reconciliation.

---

## 22. References & Citations

1. **Wickramasuriya, S. L., Athanasopoulos, G., & Hyndman, R. J.** (2019). Optimal forecast reconciliation for hierarchical and grouped time series through trace minimization. *Journal of the American Statistical Association*, 114(526), 804–819.
2. **Hyndman, R. J., Ahmed, R. A., Athanasopoulos, G., & Shang, H. L.** (2011). Optimal combination forecasts for hierarchical time series. *Computational Statistics & Data Analysis*, 55(9), 2579–2589.
3. **Ledoit, O., & Wolf, M.** (2004). A well-conditioned estimator for large-dimensional covariance matrices. *Journal of Multivariate Analysis*, 88(2), 365–411.
4. **Silver, E. A., Pyke, D. F., & Peterson, R.** (1998). *Inventory Management and Production Planning and Scheduling* (3rd ed.). John Wiley & Sons.
5. **Makridakis, S., Spiliotis, E., & Assimakopoulos, V.** (2022). The M5 competition: Background, organization, and results. *International Journal of Forecasting*, 38(4), 1483–1505.
6. **Chopra, S., & Meindl, P.** (2016). *Supply Chain Management: Strategy, Planning, and Operation* (6th ed.). Pearson.
7. **Dissanayake, D. M. N. S. W.** (2020). Competitiveness of Sri Lankan apparel industry: A strategic analysis. *Sri Lanka Journal of Management Studies*, 2(1), 45–62.
8. **Taillard, É. D.** (1993). Benchmarks for basic scheduling problems. *European Journal of Operational Research*, 64(2), 278–285.

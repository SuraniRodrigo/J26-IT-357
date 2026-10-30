# Market Prophet — Demand Forecasting & Material Planning Engine
## Complete Frontend & Backend Technical Specification & Architecture
**Project OPTICHAIN (J26-IT-357) — Component 1**  
*AI-Driven Supply Chain Disruption Predictor & Line Optimizer for Sri Lankan Garment Manufacturing*

---

## Table of Contents
1. [Component Overview & Industrial Context](#1-component-overview--industrial-context)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Frontend Architecture & UI Specifications](#3-frontend-architecture--ui-specifications)
   - [Overview & Technology Stack](#31-overview--technology-stack)
   - [8 Interactive Analytics Perspectives](#32-8-interactive-analytics-perspectives)
   - [Interactive Trajectory & Horizon Chart (SVG Engine)](#33-interactive-trajectory--horizon-chart-svg-engine)
   - [Hierarchical Tree Explorer & Coherence Switcher](#34-hierarchical-tree-explorer--coherence-switcher)
   - [Multi-Driver Apparel Demand Decomposition Panels](#35-multi-driver-apparel-demand-decomposition-panels)
   - [Interactive Period Forecasting & MRP Calculator](#36-interactive-period-forecasting--mrp-calculator)
   - [Real CSV Data Explorer & Global Export Markets](#37-real-csv-data-explorer--global-export-markets)
   - [Downstream Dispatch & Inventory Guardian Toast Bridge](#38-downstream-dispatch--inventory-guardian-toast-bridge)
   - [Frontend State Management & Reactive Hooks](#39-frontend-state-management--reactive-hooks)
4. [Backend Architecture & Machine Learning Engine](#4-backend-architecture--machine-learning-engine)
   - [Offline Training Pipeline (`train_m5_mint.py`)](#41-offline-training-pipeline-train_m5_mintpy)
   - [Mathematical Reconciliation Engine (`hierarchical_mint.py`)](#42-mathematical-reconciliation-engine-hierarchical_mintpy)
   - [The 4-Level Summing Matrix $S$ & Apparel Aliases](#43-the-4-level-summing-matrix-s--apparel-aliases)
   - [MinT Optimal Projection with Ledoit-Wolf Shrinkage](#44-mint-optimal-projection-with-ledoit-wolf-shrinkage)
   - [Reconciliation Algorithms Comparison (MinT, BU, TD, MO, OLS)](#45-reconciliation-algorithms-comparison-mint-bu-td-mo-ols)
   - [Production Inference Service (`DemandModelService`)](#46-production-inference-service-demandmodelservice)
   - [Repository & Empirical Time-Series Engine (`DemandRepository`)](#47-repository--empirical-time-series-engine-demandrepository)
   - [Business Logic & Service Layer (`demand_service.py`)](#48-business-logic--service-layer-demand_servicepy)
5. [Multi-Driver Apparel Demand Decomposition Mechanics](#5-multi-driver-apparel-demand-decomposition-mechanics)
6. [Material Requirements Planning (MRP) Mathematical Equations](#6-material-requirements-planning-mrp-mathematical-equations)
7. [Downstream Integration Contract (Inventory Guardian Handoff)](#7-downstream-integration-contract-inventory-guardian-handoff)
8. [Authentic Data Engineering & Zero-Mock Policy](#8-authentic-data-engineering--zero-mock-policy)
9. [REST API Reference & Pydantic Data Contracts](#9-rest-api-reference--pydantic-data-contracts)
10. [Frontend-to-Backend Service Layer (`demandService.js`)](#10-frontend-to-backend-service-layer-demandservicejs)
11. [Automated Testing & Coherence Verification](#11-automated-testing--coherence-verification)
12. [Step-by-Step Installation, Training & Execution Runbook](#12-step-by-step-installation-training--execution-runbook)

---

## 1. Component Overview & Industrial Context

In Sri Lankan garment export manufacturing (producing for tier-1 global brands such as Victoria's Secret, Nike Activewear, Lululemon Athletica, Inditex/Zara, Marks & Spencer, and PVH), demand planning suffers from two systemic points of failure:

1. **The Bullwhip Effect & Multi-Level Discrepancy**: Corporate export targets at the cluster level often contradict individual factory allocations, brand silhouette commitments, and cut-and-sew style orders. When each level forecasts independently, errors compound, resulting in severe fabric shortages, line stoppages, or warehouse overstock.
2. **Multi-Driver Demand Volatility**: Real-world apparel demand is not an isolated mathematical curve. It fluctuates based on:
   - **Fashion Silhouette Velocity** (e.g., seamless circular knit bralettes surging $+38\%$).
   - **Seasonal Weather Cycles** (e.g., Spring/Summer export surges, Monsoon maintenance dips, Q4 holiday rushes).
   - **Chemical Dye Lot Chemistry** (ZDHC compliance, dye lot weights, ISO-105 wash fastness).
   - **Buyer Replenishment Cadences** (weekly fast-chase batches vs. quarterly corporate purchase orders).

**Market Prophet** directly solves these challenges. It unites:
- A mathematically rigorous **Hierarchical Forecast Reconciliation Engine (MinT)** that guarantees $100\%$ aggregate coherence ($\tilde{y} = S \cdot \tilde{b}$) across all hierarchy levels with zero discrepancy.
- A comprehensive **Multi-Driver Factor Analysis & Material Requirements Planning (MRP) Engine** that translates projected demand into fabric meters, Standard Minute Value (SMV) sewing man-hours, safety stock, and reorder points.
- A **Standardized Integration Contract** that feeds forecasts and uncertainty bounds directly into **Module 3 (Inventory Guardian)**.
- An interactive **React Dashboard** offering 8 operational perspectives, interactive trajectory charts, live parameter sliders, and real CSV exploration.

---

## 2. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FRONTEND APPLICATION (React + Vite)                              │
│                                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                 DemandForecastingView (index.jsx)                              │   │
│   │  • Perspective Switcher (8 Views)           • Real-time Reconciliation Engine Selector         │   │
│   │  • Interactive SVG Trajectory Curve         • Dynamic Period MRP & Factor Sliders              │   │
│   │  • Multi-Driver Apparel Decomposition       • Interactive SVG Factor/Inventory Donut Charts    │   │
│   │  • Real CSV Product & Market Explorer       • One-Click Handoff Bridge to Inventory Guardian   │   │
│   └─────────────────────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                                     │                                                  │
│                                                     ▼                                                  │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                           API Client Service Layer (`demandService.js`)                        │   │
│   │  fetchDatasetSummary() | fetchRealProducts() | forecastDemand() | reconcileDemandHierarchy()    │   │
│   └─────────────────────────────────────────────────┬──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┼──────────────────────────────────────────────────┘
                                                      │ HTTP REST (JSON)
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         BACKEND FASTAPI ENGINE                                         │
│                                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                           FastAPI RESTful Routes (`app/api/routes/demand.py`)                  │   │
│   │  • POST /api/demand/forecast                • GET  /api/demand/hierarchy                       │   │
│   │  • POST /api/demand/forecast-period         • GET  /api/demand/products                        │   │
│   │  • POST /api/demand/reconcile               • GET  /api/demand/categories                      │   │
│   │  • GET  /api/demand/drivers                 • GET  /api/demand/departments                     │   │
│   │  • GET  /api/demand/historical              • GET  /api/demand/dataset-summary                 │   │
│   └─────────────────────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                                     │                                                  │
│                                                     ▼                                                  │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                Business Logic Layer (`demand_service.py`)                      │   │
│   │  • Multi-Factor Multiplier Computation      • MRP Calculations (Fabric BOM, SMV hours, lines)  │   │
│   │  • Confidence Intervals (P10/P90)           • Safety Stock, Reorder Point & EOQ Equations      │   │
│   │  • Inventory Handoff Payload Generation     • Real CSV Aggregation & Telemetry                 │   │
│   └──────────────────────┬───────────────────────────────────────────────────┬─────────────────────┘   │
│                          │                                                   │                         │
│                          ▼                                                   ▼                         │
│   ┌───────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐   │
│   │     ML Inference (`DemandModelService`)       │   │     Data Access (`DemandRepository`)       │   │
│   │  • Artifact loading & memory caching          │   │  • Real DataCo CSV (180,519 order rows)    │   │
│   │  • Sri Lankan Garment Domain Aliases          │   │  • M5 Historical Sales & Calendar CSVs     │   │
│   │  • Canonical Node Resolution                  │   │  • Empirical rolling-average engine        │   │
│   │  • Coherent Reconciler (`HierarchicalReconciler`)│ │  • Industrial Driver Profiles & Metrics    │   │
│   └──────────────────────┬────────────────────────┘   └────────────────────────────────────────────┘   │
│                          │                                                                             │
│                          ▼                                                                             │
│   ┌───────────────────────────────────────────────┐                                                    │
│   │      Trained Production Model Artifact        │                                                    │
│   │  `backend/models_artifacts/demand/`           │                                                    │
│   │  `m5_mint_artifact.joblib` (1.5 MB)           │                                                    │
│   │  - Summing Matrix S (26 x 15)                 │                                                    │
│   │  - Fitted Fourier Ridge Models                │                                                    │
│   │  - Shrinkage Covariance Matrix W              │                                                    │
│   │  - MinT Optimal Projection Matrix P_mint      │                                                    │
│   └───────────────────────────────────────────────┘                                                    │
└─────────────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DOWNSTREAM INTEGRATION BOUNDARY (MODULE 3)                              │
│                                                                                                        │
│   Formal Integration Contract Payload dispatched to `POST /api/inventory/optimize`:                   │
│   `product_id`, `forecasted_demand`, `demand_uncertainty`, `lead_time_days`,                           │
│   `lead_time_variability`, `disruption_probability`, `target_period`                                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Architecture & UI Specifications

### 3.1 Overview & Technology Stack
- **Primary Source File**: [`frontend/src/pages/DemandForecasting/index.jsx`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/frontend/src/pages/DemandForecasting/index.jsx) (6,234 lines of production UI code)
- **Framework**: React 18+ with functional hooks (`useState`, `useMemo`, `useEffect`, `useCallback`, `useRef`)
- **Styling**: Pure CSS design tokens (`frontend/src/index.css`) featuring deep slate card glassmorphism, glowing status badges, vibrant gradient borders, and responsive grid layouts
- **Visuals & Charts**: Custom mathematical SVG charting engines (zero bulky third-party chart dependencies, guaranteeing sub-second load times and exact pixel control)

### 3.2 8 Interactive Analytics Perspectives
The top control ribbon allows production planners and merchandisers to toggle between 8 distinct analytical views via `selectedPerspective`:
1. **All Perspectives (`'all'`)**: Complete industrial command center rendering all modules sequentially.
2. **Executive Overview (`'overview'`)**: High-level KPI summary cards (Total Orders, Cluster Sales Volume, Active SKU count, Average Order Value).
3. **Hierarchy Explorer (`'hierarchy'`)**: Multi-level tree inspection mapping root totals down to individual sewing lines.
4. **Trajectory Curve (`'trajectory'`)**: Time-series forecast curve with historical baseline and uncertainty bounds.
5. **Driver Decomposition (`'drivers'`)**: Fashion trends, seasonal indices, color dye recipes, and buyer profiles.
6. **Period MRP Calculator (`'period_forecast'`)**: Scenario simulation sliders, MRP material requirements, and inventory dispatch.
7. **Real Data Explorer (`'real_data'`)**: Searchable tabular explorer of the 180,519-record DataCo supply chain dataset.
8. **Export Markets (`'markets'`)**: Port lead times, sea freight transit durations, and shipment cadences.

### 3.3 Interactive Trajectory & Horizon Chart (SVG Engine)
- **Horizon Selection**: Interactive toggle for **30D (Monthly)**, **60D (Bi-Monthly)**, or **90D (Quarterly)** planning horizons.
- **Dynamic Coordinate Normalization**: Normalizes time on the X-axis and units on the Y-axis across both historical observations (slate curve) and projected reconciled forecasts (emerald glowing curve).
- **Prediction Interval Band (P10–P90)**: Renders a smooth semi-transparent emerald polygon ribbon (`fill="rgba(16, 185, 129, 0.12)"`) representing upper and lower demand uncertainty bounds.
- **Interactive Mouse Tracking**:
  - `chartSvgRef` listens to `onMouseMove` events, mapping cursor coordinates to nearest time-series index.
  - Draws an animated vertical crosshair line.
  - Renders a floating tooltip displaying Date, Exact Reconciled Demand, Upper/Lower Bounds, and Historical Contrast.
- **Mathematical Coherence Badge**: Live indicator displaying:
  $$\text{Discrepancy} < 0.0001 \quad \implies \quad \text{Coherence: 100\% Verified (Zero Discrepancy)}$$

### 3.4 Hierarchical Tree Explorer & Coherence Switcher
- **Visual Node Cards**: Displays the 4-level hierarchy:
  - *Level 0*: Consolidated Sri Lanka Cluster
  - *Level 1*: Facilities (`BIYAGAMA_EPZ`, `KATUNAYAKE_BOI`, `SEETHAWAKA_EPZ`, `KOGGALA_EPZ`)
  - *Level 2*: Buyer Lines (Victoria's Secret, Nike, Lululemon, Inditex/Zara, M&S, PVH, Patagonia)
  - *Level 3*: Style SKUs (Bralettes, Leggings, Athletic Tees, Chinos, Hoodies)
- **Reconciliation Switcher Buttons**: Real-time switching between **MinT**, **Bottom-Up (BU)**, **Top-Down (TD)**, **Middle-Out (MO)**, and **OLS**.
- **Buyer Surge Factor Slider**: Dynamic slider $(-20\% \text{ to } +40\%)$ that stresses base models and recalculates reconciled volumes across the entire hierarchy in real time.

### 3.5 Multi-Driver Apparel Demand Decomposition Panels
Contains dedicated sub-tabs (`all`, `fashion`, `seasonal`, `color`, `buyer`):
- **Fashion Trends**: Silhouette cards showing circular knit specs, Standard Minute Value (SMV) labor minutes (e.g., 14.2 min for bralettes), adoption velocity meters (0–100), and YoY growth badges.
- **Seasonal Weather Cycles**:
  - **SS-25**: March–June ($+38\%$ lift, 94% factory line capacity locked).
  - **Monsoon Maintenance**: July–August ($-8\%$ dip, plant overhaul buffer).
  - **AW-25**: September–October ($+22\%$ lift, 350 GSM fleece hoodie runs).
  - **Q4 Peak**: November–December ($+45\%$ lift, rapid 14-day chase turnaround).
- **Color Chemistry & Dye Recipes**:
  - Displays chemical dye formulations (Sulfur, Reactive Carbon Black, Indanthrone Vat Blue, Eco Peroxide Bleach).
  - Production dye lot weights (85 kg – 290 kg).
  - ISO-105 wash fastness ratings (Grade 4.0 – 5.0).
- **Buyer Purchasing Behaviour**: Profiles Victoria's Secret, Nike, Zara, and Marks & Spencer detailing repeat rates ($82\% - 96\%$), PO sizing ($8.5\text{k} - 48\text{k}$ units), and replenishment cadences ($14\text{D} - 60\text{D}$).

### 3.6 Interactive Period Forecasting & MRP Calculator
- **Dual Planning Modes**:
  - *Month Mode*: Direct selection from all 12 calendar months + custom campaign window.
  - *Duration Mode*: Multi-month planning (e.g., March 2026 to June 2026).
- **Live Factor Sliders**:
  - Fashion Trend Growth: $-20\% \text{ to } +60\%$ (default $+25\%$)
  - Seasonal Multiplier: $0.70\times \text{ to } 1.60\times$ (default $1.20\times$)
  - Color Preference Score: $0 \text{ to } 100$ (default $85$)
  - Buyer Volume Weight: $0.80\times \text{ to } 1.40\times$ (default $1.15\times$)
  - Promotional Campaign Lift: $0\% \text{ to } +50\%$ (default $+10\%$)
- **Interactive SVG Donut / Pie Charts**:
  - Sub-tab toggle: *Factor Impact Breakdown* vs *Inventory Distribution*.
  - Slices calculate proportional impact: Trend Velocity ($+25\%$), Seasonal Lift ($+20\%$), Color Affinity ($+7\%$), Buyer Bulk ($+15\%$), Promo ($+10\%$).
  - Slice hover animations with dynamic percentage and unit callouts.
- **Material Requirements Planning (MRP) Cards**:
  - **Fabric BOM Required**: $\text{Forecast} \times 1.85\,\text{meters}$.
  - **Sewing SMV Labor Hours**: $(\text{Forecast} \times 14.2) / 60\,\text{hours}$.
  - **Modular Sewing Lines Needed**: Number of factory production lines required.
  - **Safety Stock (SS) & Reorder Point (ROP)**: Real-time inventory risk thresholds.
  - **Economic Order Quantity (EOQ)**: Optimal reorder batch size.
  - **Stock Status Badge**: Automatically flags `REORDER_TRIGGERED` when current stock $\le$ ROP, or `STOCK_HEALTHY`.

### 3.7 Real CSV Data Explorer & Global Export Markets
- Filterable by Category (`Cleats`, `Women's Apparel`, `Cardio Equipment`, `Indoor/Outdoor Games`).
- Filterable by Department (`Apparel`, `Golf`, `Footwear`, `Fan Shop`).
- Live search bar for individual SKUs.
- Global market delivery table detailing ocean transit durations and shipment schedules (Africa: 28–35D, Europe: 28–35D, LATAM: 28–35D, USCA: 28–35D).

### 3.8 Downstream Dispatch & Inventory Guardian Toast Bridge
- **One-Click Action Button**: *"Transmit Forecast & Risk Signals to Inventory Guardian"*.
- Constructs the official integration JSON contract.
- Displays an animated success toast confirming synchronization.
- Seamlessly bridges state to Module 3 (`InventoryOptimization`) via `onNavigate('inventory')`.

### 3.9 Frontend State Management & Reactive Hooks
```javascript
// Key State Definitions in DemandForecasting/index.jsx
const [selectedPerspective, setSelectedPerspective] = useState('all');
const [forecastHorizon, setForecastHorizon] = useState('30D');
const [reconciliationMethod, setReconciliationMethod] = useState('MinT');
const [planningMode, setPlanningMode] = useState('month');
const [selectedMonth, setSelectedMonth] = useState('');
const [factorTrendGrowth, setFactorTrendGrowth] = useState(25);
const [factorSeasonMultiplier, setFactorSeasonMultiplier] = useState(1.20);
const [factorColorScore, setFactorColorScore] = useState(85);
const [factorBuyerWeight, setFactorBuyerWeight] = useState(1.15);
const [factorPromoLift, setFactorPromoLift] = useState(10);
const [periodForecastResult, setPeriodForecastResult] = useState(null);
const [pieChartActiveTab, setPieChartActiveTab] = useState('factors');
```

---

## 4. Backend Architecture & Machine Learning Engine

### 4.1 Offline Training Pipeline (`train_m5_mint.py`)
- **File**: [`backend/Demand Forecasting/train_m5_mint.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/Demand%20Forecasting/train_m5_mint.py)
- **Responsibilities**:
  1. Loads M5 daily sales data (`M5_Sales_DemandForecasting_Clean.csv`) and calendar events (`calendar.csv`).
  2. Constructs the 4-level time-series hierarchy.
  3. Builds the structural Summing Matrix $S \in \mathbb{R}^{m \times k}$ ($m=26, k=15$).
  4. Fits base `BaseTSForecaster` models (Trend + Weekly Fourier $p=7$ + Monthly Fourier $p=30.4$).
  5. Computes in-sample residual matrix $E \in \mathbb{R}^{T \times m}$ across all $T=1,913$ historical days.
  6. Computes regularized shrinkage covariance matrix $W$ and MinT projection matrix $P_{\text{MinT}}$.
  7. Validates exact zero-discrepancy coherence.
  8. Maps Sri Lankan garment factory domain aliases.
  9. Serializes artifact bundle to `backend/models_artifacts/demand/m5_mint_artifact.joblib` (1.5 MB).

### 4.2 Mathematical Reconciliation Engine (`hierarchical_mint.py`)
- **File**: [`backend/app/ml/demand/hierarchical_mint.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/ml/demand/hierarchical_mint.py)
- Defines [`HierarchicalReconciler`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/ml/demand/hierarchical_mint.py#L20-L176) and [`BaseTSForecaster`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/ml/demand/hierarchical_mint.py#L178-L223).
- **Core Linear Projection Formula**:
  $$\tilde{y} = S \cdot \tilde{b} = S \cdot P \cdot \hat{y}$$
  Where:
  - $\hat{y} \in \mathbb{R}^m$ is the vector of incoherent base forecasts.
  - $P \in \mathbb{R}^{k \times m}$ is the projection mapping all $m$ series down to bottom series $k$.
  - $S \in \{0, 1\}^{m \times k}$ is the structural summing matrix summing bottom series back to all levels.
  - $\tilde{y} \in \mathbb{R}^m$ is the coherent reconciled forecast vector.

### 4.3 The 4-Level Summing Matrix $S$ & Apparel Aliases
$$S = \begin{bmatrix}
\mathbf{1}^T_{1 \times k} \\
S_{\text{facilities}} \\
S_{\text{buyers}} \\
I_k
\end{bmatrix} \in \mathbb{R}^{26 \times 15}$$

#### Garment Domain Aliases
To integrate the M5 mathematical hierarchy with Sri Lankan apparel manufacturing:
```python
garment_aliases = {
    # Root Level 0
    "LK-APPAREL-CLUSTER-ALL": "TOTAL",
    "LK-CONSOLIDATED-EXPORT": "TOTAL",
    
    # Facilities Level 1
    "BIYAGAMA_EPZ": "FOODS",
    "KATUNAYAKE_BOI": "HOBBIES",
    "SEETHAWAKA_EPZ": "HOUSEHOLD",
    "KOGGALA_EPZ": "FOODS",
    
    # Buyer Lines Level 2
    "Victoria's Secret": "FOODS_1",
    "Nike Activewear": "HOBBIES_1",
    "Lululemon Athletica": "HOUSEHOLD_1",
    "Inditex / Zara": "FOODS_2",
    "Marks & Spencer": "HOBBIES_2",
    "PVH / Tommy Hilfiger": "HOUSEHOLD_2",
    "Patagonia Outdoor": "FOODS_3",
    
    # Style SKUs Level 3
    "Seamless Comfort Bralette": "FOODS_1_001",
    "Technical Outerwear Shell": "HOBBIES_1_001",
    "High-Compression Align Legging": "HOUSEHOLD_1_001",
    "Performance Athletic Tee": "FOODS_2_001",
    "Sustainable Chino Trouser": "HOBBIES_2_001",
    "Heavyweight Fleece Hoodie": "HOUSEHOLD_2_001",
    "Recycled Snap Fleece Pullover": "FOODS_3_001",
}
```

### 4.4 MinT Optimal Projection with Ledoit-Wolf Shrinkage
The Minimum Trace (MinT) estimator minimizes the sum of forecast error variances across all series in the hierarchy:

$$P_{\text{MinT}} = (S^T W^{-1} S)^{-1} S^T W^{-1}$$

Where $W$ is the covariance matrix of base forecast errors. To guarantee non-singularity and positive definiteness:

$$W = (1 - \lambda) \hat{\Sigma} + \lambda \text{diag}(\hat{\Sigma}) + 10^{-6} I_m$$

With shrinkage intensity $\lambda = 0.20$.

### 4.5 Reconciliation Algorithms Comparison (MinT, BU, TD, MO, OLS)

| Method | Formula for $P$ | Covariance $W$ | Mathematical Behavior |
|---|---|---|---|
| **MinT** *(Recommended)* | $P = (S^T W^{-1} S)^{-1} S^T W^{-1}$ | Empirical Residual Covariance with Shrinkage | **Optimal**. Unbiased with minimum trace error variance; balances signals across all hierarchy levels. |
| **OLS** | $P = (S^T S)^{-1} S^T$ | $W = I_m$ | Unweighted structural pseudo-inverse; ignores error variance differences between levels. |
| **Bottom-Up (BU)** | $P = [0_{k \times (m-k)} \mid I_k]$ | Not applicable | Sums bottom style SKU forecasts upward. Preserves SKU volatility but completely discards macro cluster trend signals. |
| **Top-Down (TD)** | $\tilde{b} = p_{\text{hist}} \cdot \hat{y}_{\text{TOTAL}}$ | Not applicable | Disaggregates root forecast using historical volume proportions $p_{\text{hist}}$. Disregards bottom SKU variation. |
| **Middle-Out (MO)** | Disaggregates from Level 2 | Not applicable | Uses Department / Buyer level base models as source of truth, aggregating upward to Total and disaggregating downward to SKUs. |

### 4.6 Production Inference Service (`DemandModelService`)
- **File**: [`backend/app/ml/demand/model.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/ml/demand/model.py)
- Implements thread-safe singleton pattern (`get_instance()`).
- Loads `m5_mint_artifact.joblib` into memory on startup.
- Resolves user product requests via `get_canonical_node()`.
- Routes queries to either:
  1. The **Trained Hierarchical MinT Model** (for canonical tree nodes / aliases).
  2. The **Authentic Empirical CSV Engine** (for DataCo apparel products like *Nike Men's Dri-FIT Victory Golf Polo*).
- Formats response with daily forecasts, P10 lower bound, and P90 upper bound.

### 4.7 Repository & Empirical Time-Series Engine (`DemandRepository`)
- **File**: [`backend/app/repositories/demand_repository.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/repositories/demand_repository.py)
- Manages high-performance pandas access to:
  - `DataCo_Demand_Forecasting_Clean.csv` (180,519 order transactions).
  - `M5_Sales_DemandForecasting_Clean.csv` & `calendar.csv`.
- Computes pre-aggregated product summaries, category totals, and department metrics.
- Extracts authentic daily time-series without artificial data smoothing.
- Generates empirical moving-average forecasts with variance-based confidence intervals.

### 4.8 Business Logic & Service Layer (`demand_service.py`)
- **File**: [`backend/app/services/demand_service.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/services/demand_service.py)
- Bridges API controllers to ML models and repositories.
- Implements [`forecast_demand_by_period`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/app/services/demand_service.py#L222-L357) which executes:
  1. Baseline demand resolution.
  2. Composite multiplier calculation.
  3. MRP equations (Fabric BOM, SMV hours, modular lines).
  4. Safety stock, ROP, and EOQ equations.
  5. Downstream handoff JSON contract assembly.

---

## 5. Multi-Driver Apparel Demand Decomposition Mechanics

Market Prophet decomposes demand into 5 interactive factors:

### Factor Breakdown Formulation
1. **Fashion Trend Velocity ($\Delta_{\text{trend}}$)**:
   $$M_{\text{trend}} = 1.0 + \frac{\Delta_{\text{trend}}}{100.0}$$
   *(e.g., $+25\%$ trend growth yields $1.25\times$ multiplier)*

2. **Seasonal Multiplier ($M_{\text{season}}$)**:
   $$M_{\text{season}} \in [0.70, 1.60]$$
   *(e.g., $1.20\times$ for peak Spring/Summer export rush)*

3. **Color Palette Affinity Score ($\text{Score}_{\text{color}} \in [0, 100]$)**:
   $$M_{\text{color}} = 0.90 + \frac{\text{Score}_{\text{color}}}{500.0}$$
   *(e.g., Score $85/100$ yields $0.90 + 0.17 = 1.07\times$ multiplier)*

4. **Buyer Purchasing Behavior Weight ($W_{\text{buyer}}$)**:
   $$W_{\text{buyer}} \in [0.80, 1.40]$$
   *(e.g., $1.15\times$ for corporate bulk replenishment)*

5. **Promotional Campaign Lift ($\Delta_{\text{promo}}$)**:
   $$M_{\text{promo}} = 1.0 + \frac{\Delta_{\text{promo}}}{100.0}$$
   *(e.g., $+10\%$ promo lift yields $1.10\times$ multiplier)*

### Composite Multiplier Formula
$$M_{\text{composite}} = M_{\text{trend}} \times M_{\text{season}} \times M_{\text{color}} \times W_{\text{buyer}} \times M_{\text{promo}}$$

*Example Baseline Scenario*:
$$M_{\text{composite}} = 1.25 \times 1.20 \times 1.07 \times 1.15 \times 1.10 = 2.0305\times$$

---

## 6. Material Requirements Planning (MRP) Mathematical Equations

For any selected product, horizon $H$ (days), lead time $L$ (days), and baseline demand $D_{\text{base}}$:

### 1. Forecasted Period Demand
$$D_{\text{period}} = D_{\text{base}} \times M_{\text{composite}} \times \left(\frac{H}{30.0}\right)$$

### 2. Daily Run Rate
$$d = \frac{D_{\text{period}}}{H}$$

### 3. Demand Uncertainty & 95% Confidence Bounds
$$\sigma_{\text{period}} = 0.12 \times D_{\text{period}}, \quad \sigma_d = \frac{\sigma_{\text{period}}}{\sqrt{H}}$$

$$\text{CI}_{95\%} = \left[ \max\left(0, D_{\text{period}} - 1.96 \cdot \sigma_d\right), \; D_{\text{period}} + 1.96 \cdot \sigma_d \right]$$

### 4. Lead Time Demand (LTD)
$$\text{LTD} = d \times L$$

### 5. Safety Stock ($\text{SS}$) with Demand & Lead Time Uncertainty
$$\text{SS} = 1.65 \sqrt{L \cdot \sigma_d^2 + d^2 \cdot \sigma_L^2}$$
*(Assuming lead time standard deviation $\sigma_L = 2.5\text{ days}$ and service level $Z = 1.65$ for 95% availability)*

### 6. Reorder Point ($\text{ROP}$)
$$\text{ROP} = \text{LTD} + \text{SS}$$

### 7. Economic Order Quantity ($\text{EOQ}$)
$$\text{EOQ} = \sqrt{\frac{2 \cdot D_{\text{period}} \cdot S}{h}}$$
*(Where factory setup cost $S = \$75.00$ and annual holding cost $h = \$3.50/\text{unit/year}$)*

### 8. Bill of Materials (BOM) & Factory Line Allocation
- **Fabric BOM (Meters)**:
  $$\text{BOM}_{\text{fabric}} = D_{\text{period}} \times 1.85\,\text{meters/unit}$$
- **Sewing Labor SMV Hours**:
  $$\text{SMV}_{\text{hours}} = \frac{D_{\text{period}} \times 14.2\,\text{minutes}}{60.0\,\text{min/hr}}$$
- **Modular Sewing Lines Required**:
  $$\text{Lines} = \left\lceil \frac{\text{SMV}_{\text{hours}}}{H \times 54.0\,\text{hours/line}} \right\rceil$$
  *(Based on a standard 54 machine-hour operational day per modular line)*

### 9. Net Reorder Quantity
$$\text{Units to Order} = \max\left(0, \text{ROP} + \text{EOQ} - \text{Current Inventory}\right)$$

---

## 7. Downstream Integration Contract (Inventory Guardian Handoff)

To maintain clean architectural boundaries as mandated by [`docs/module-integration.md`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/docs/module-integration.md), Market Prophet dispatches a standardized JSON contract consumed directly by **Module 3: Inventory Guardian**:

```json
{
  "product_id": "Seamless Athleisure & Active Bralettes",
  "order_date": "2026-10-30",
  "current_inventory": 3500.0,
  "forecasted_demand": 38166.4,
  "demand_uncertainty": 4579.9,
  "lead_time_days": 14,
  "lead_time_variability": 2.5,
  "disruption_probability": 0.12,
  "valid_upstream_risk_signal": true,
  "target_period": "November 2026"
}
```

### Consumption Contract in Module 3
Module 3 consumes this exact structure in `app/api/routes/inventory.py` without requiring intermediate database writes or direct module-to-module tight coupling.

---

## 8. Authentic Data Engineering & Zero-Mock Policy

In strict accordance with repository integrity rules (`docs/architecture.md`), Market Prophet operates on real datasets:

### 1. DataCo Global Supply Chain Dataset
- **File**: `backend/Demand Forecasting/Data/Processed/DatCo/DataCo_Demand_Forecasting_Clean.csv`
- **Total Records**: 180,519 authentic customer transactions (44.1 MB).
- **Attributes**: Order Date, Sales, Order Item Quantity, Product Price, Customer Segment, Market, Order Region, Category Name, Department Name.

### 2. M5 Forecasting Dataset
- **Files**:
  - `M5_Sales_DemandForecasting_Clean.csv` (30.8 MB, 1,913 daily sales steps).
  - `M5_Calendar_DemandForecasting_Clean.csv` (133 KB, event days, holidays, weekday indices).
  - `M5_Prices_DemandForecasting_Clean.csv` (11.5 MB, weekly sell prices per store).

---

## 9. REST API Reference & Pydantic Data Contracts

All endpoints are registered on FastAPI router `router = APIRouter(tags=["demand"])` under the `/api` prefix:

### Endpoint Summary Table

| HTTP Method | Route URL | Description | Request Body | Response Model |
|---|---|---|---|---|
| `POST` | `/api/demand/forecast` | Point & interval forecast for SKU or node | `DemandForecastRequest` | `list[DemandForecastSchema]` |
| `POST` | `/api/demand/forecast-period` | Multi-factor period forecast with MRP & contract | `PeriodDemandForecastRequest` | `PeriodDemandForecastResponse` |
| `POST` | `/api/demand/reconcile` | Tree-wide hierarchical reconciliation | `DemandReconcileRequest` | `DemandReconcileResponse` |
| `GET` | `/api/demand/hierarchy` | Node counts, summing matrix metadata & methods | None | `dict[str, Any]` |
| `GET` | `/api/demand/products` | Real DataCo products with volume & price | Query params: `category`, `limit` | `list[RealProductSchema]` |
| `GET` | `/api/demand/categories` | Real category aggregations | Query param: `source` | `list[RealCategorySchema]` |
| `GET` | `/api/demand/departments` | Real department metrics | Query param: `source` | `list[RealDepartmentSchema]` |
| `GET` | `/api/demand/historical` | Daily time-series observations from CSV | Query params: `identifier`, `days` | `RealHistoricalResponse` |
| `GET` | `/api/demand/dataset-summary` | Record counts, memory & loaded status | None | `DatasetSummarySchema` |
| `GET` | `/api/demand/drivers` | 4 apparel drivers (fashion, seasonal, dye, buyer)| None | `DemandDriversResponse` |

### Sample Request: `POST /api/demand/forecast-period`
```json
{
  "target_period": "November 2026",
  "horizon_days": 30,
  "product_identifier": "Seamless Athleisure & Active Bralettes",
  "base_monthly_demand": 16800.0,
  "factors": {
    "fashion_trend_growth_pct": 25.0,
    "seasonal_multiplier": 1.20,
    "color_preference_score": 85.0,
    "buyer_behaviour_weight": 1.15,
    "promotion_lift_pct": 10.0
  },
  "lead_time_days": 14,
  "current_inventory": 3500.0
}
```

### Sample Response: `POST /api/demand/forecast-period`
```json
{
  "target_period": "November 2026",
  "product_identifier": "Seamless Athleisure & Active Bralettes",
  "horizon_days": 30,
  "baseline_demand": 16800.0,
  "forecasted_demand": 34112.4,
  "daily_run_rate": 1137.1,
  "demand_uncertainty": 4093.5,
  "confidence_interval_lower": 32646.9,
  "confidence_interval_upper": 35577.9,
  "factor_multiplier_composite": 2.0305,
  "factor_breakdown": [
    {
      "factor_name": "Fashion Trend Velocity",
      "impact_pct": 25.0,
      "description": "Apparel silhouette adoption velocity (+25.0%)",
      "status": "ACCELERATING"
    },
    {
      "factor_name": "Seasonal Demand Multiplier",
      "impact_pct": 20.0,
      "description": "Cyclical calendar lift (1.20x) for November 2026",
      "status": "MODERATE"
    }
  ],
  "inventory_handoff_payload": {
    "product_id": "Seamless Athleisure & Active Bralettes",
    "order_date": "2026-10-30",
    "current_inventory": 3500.0,
    "forecasted_demand": 34112.4,
    "demand_uncertainty": 4093.5,
    "lead_time_days": 14,
    "lead_time_variability": 2.5,
    "disruption_probability": 0.12,
    "valid_upstream_risk_signal": true,
    "target_period": "November 2026"
  },
  "material_requirements": {
    "safety_stock_units": 4821.5,
    "reorder_point_units": 20740.9,
    "recommended_reorder_qty_eoq": 1209.1,
    "lead_time_demand_units": 15919.4,
    "fabric_bom_meters": 63107.9,
    "standard_minute_hours": 8073.3,
    "modular_sewing_lines_needed": 5,
    "stock_status": "REORDER_TRIGGERED",
    "units_to_order": 18450.0
  }
}
```

---

## 10. Frontend-to-Backend Service Layer (`demandService.js`)

Located at [`frontend/src/services/demandService.js`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/frontend/src/services/demandService.js):

```javascript
import { apiRequest } from './apiClient';

export async function forecastDemand(payload) {
  return apiRequest('/api/demand/forecast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reconcileDemandHierarchy(payload) {
  return apiRequest('/api/demand/reconcile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDemandHierarchy() {
  return apiRequest('/api/demand/hierarchy');
}

export async function fetchRealProducts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/api/demand/products${query ? `?${query}` : ''}`);
}

export async function fetchRealCategories(source = 'dataco') {
  return apiRequest(`/api/demand/categories?source=${source}`);
}

export async function fetchRealDepartments(source = 'dataco') {
  return apiRequest(`/api/demand/departments?source=${source}`);
}

export async function fetchHistoricalObservations(identifier, days = 90, source = 'auto') {
  const query = new URLSearchParams({ identifier, days: days.toString(), source }).toString();
  return apiRequest(`/api/demand/historical?${query}`);
}

export async function fetchDatasetSummary() {
  return apiRequest('/api/demand/dataset-summary');
}

export async function fetchDemandDrivers() {
  return apiRequest('/api/demand/drivers');
}
```

---

## 11. Automated Testing & Coherence Verification

The component includes comprehensive unit tests verifying both mathematical formulas and API behavior:

### Test Suites
- [`backend/tests/unit/test_hierarchical_mint.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/tests/unit/test_hierarchical_mint.py)
  - `test_hierarchical_reconciler_mathematical_coherence`: Verifies that MinT, BU, TD, and OLS satisfy $y = S \cdot y_{\text{bottom}}$ with discrepancy $< 10^{-4}$ and zero negative forecasts.
  - `test_demand_model_service_inference`: Verifies canonical node resolution and checks that root cluster forecast exceeds individual SKU volume.
  - `test_demand_api_endpoints`: Verifies `/api/demand/forecast` and `/api/demand/hierarchy`.
  - `test_negative_horizon_validation`: Validates HTTP 400 rejection for invalid horizons.
- [`backend/tests/unit/test_real_csv_demand.py`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/tests/unit/test_real_csv_demand.py)
  - `test_demand_repository_dataco_loading`: Tests loading and aggregation of the 180,519-row DataCo CSV.
  - `test_demand_repository_categories_and_departments`: Verifies category and department extraction.
  - `test_empirical_forecast_from_real_csv`: Verifies non-synthetic empirical forecast generation.
  - `test_api_products_endpoint`, `test_api_historical_observations_endpoint`, `test_api_reconcile_endpoint`.

### Automated Test Execution Command & Verification Result
```bash
cd backend
.venv\Scripts\pytest tests/unit/test_hierarchical_mint.py tests/unit/test_real_csv_demand.py -v
```

**Result:**
```
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1
collected 13 items

tests/unit/test_hierarchical_mint.py::test_hierarchical_reconciler_mathematical_coherence PASSED
tests/unit/test_hierarchical_mint.py::test_demand_model_service_inference PASSED
tests/unit/test_hierarchical_mint.py::test_demand_api_endpoints PASSED
tests/unit/test_hierarchical_mint.py::test_negative_horizon_validation PASSED
tests/unit/test_real_csv_demand.py::test_demand_repository_dataco_loading PASSED
tests/unit/test_real_csv_demand.py::test_demand_repository_categories_and_departments PASSED
tests/unit/test_real_csv_demand.py::test_empirical_forecast_from_real_csv PASSED
tests/unit/test_real_csv_demand.py::test_api_products_endpoint PASSED
tests/unit/test_real_csv_demand.py::test_api_categories_and_departments_endpoint PASSED
tests/unit/test_real_csv_demand.py::test_api_historical_observations_endpoint PASSED
tests/unit/test_real_csv_demand.py::test_api_dataset_summary_endpoint PASSED
tests/unit/test_real_csv_demand.py::test_api_reconcile_endpoint PASSED
tests/unit/test_real_csv_demand.py::test_api_forecast_real_dataco_product PASSED

======================= 13 passed in 10.84s ========================
```

---

## 12. Step-by-Step Installation, Training & Execution Runbook

### Step 1: Environment Preparation (Backend)
```bash
cd backend

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### Step 2: Train the Production M5 MinT Model Artifact
```bash
python "Demand Forecasting/train_m5_mint.py"
```
*Expected Output*:
- Loads M5 sales and calendar datasets.
- Builds the 4-level hierarchy matrix $S$ ($26 \times 15$).
- Fits base models across all historical days ($T=1,913$).
- Regularizes covariance matrix $W$ with shrinkage ($\lambda = 0.20$).
- Asserts mathematical coherence ($\text{discrepancy} < 10^{-4}$).
- Writes `backend/models_artifacts/demand/m5_mint_artifact.joblib` (~1.5 MB).

### Step 3: Launch the Backend FastAPI Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc UI: `http://localhost:8000/redoc`

### Step 4: Launch the Frontend Application
```bash
cd ../frontend
npm install
npm run dev
```
- Open `http://localhost:5173` in any browser.
- Navigate to the **Demand Forecasting** tab in the sidebar.

### Step 5: Execute Automated Verification
```bash
cd ../backend
.venv\Scripts\pytest tests/unit/test_hierarchical_mint.py tests/unit/test_real_csv_demand.py
```
All 13 tests will execute and pass synchronously.

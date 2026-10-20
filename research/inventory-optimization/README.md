# Module 3: Disruption-Aware Adaptive Inventory Optimization ("Inventory Guardian")
**OptiChain: AI-Driven Supply Chain Disruption Predictor & Line Optimizer for Sri Lankan Garment Factories**  
**Researcher / Developer:** Rodrigo K. S. (IT23324992)  
**Academic Context:** Final Year Research Project, SLIIT  
**Branch:** `Disruption_Aware_Adaptive_Inventory_Module`  

---

## 1. Executive Summary & Research Problem

In export apparel manufacturing hubs such as Sri Lanka (e.g., MAS Holdings, Brandix), production operations rely heavily on imported raw materials (fabrics, specialty dyes, zippers, elastane threads) sourced across cross-border maritime corridors (India, China, Vietnam, Europe). 

Traditional manufacturing planning applies static periodic replenishment rules or classic Economic Order Quantity (EOQ) assumptions. Under global logistical vulnerabilities (such as Red Sea chokepoint diversions, port berthing backlogs, and regional feeder vessel delays), static policies suffer from severe vulnerabilities:
1. **Buffer Inelasticity:** Safety stocks calibrated under static assumptions assume normal lead times with stationary variances, causing frequent stockouts when disruptions occur.
2. **Disconnected Signals:** Demand forecasting and upstream procurement disruption indicators exist in silos; procurement risk alerts do not dynamically adapt warehouse inventory replenishment.
3. **Sewing Line Stoppages:** Material shortages ripple downstream, idling multimillion-dollar sewing lines and causing missed shipment deadlines.

---

## 2. Research Objective

To develop, mathematically validate, and deploy a **Disruption-Aware Adaptive Inventory Optimization Engine** that:
- Ingests stochastic demand forecasts from Module 1 (**Market Prophet**) and lead-time disruption probabilities from Module 2 (**Procurement Guardian**).
- Computes non-linear risk factors, dynamically extending lead times and safety stock buffers via dual-variance Kingman formulations.
- Formulates demand-coverage periodic review replenishment quantities ($ROQ$) rather than rigid static EOQ models.
- Integrates an auxiliary **XGBoost Backorder Classification Model** ($ROC\text{-}AUC = 0.9059$) as an early warning risk signal.
- Delivers an actionable downstream contract to Module 4 (**Line Optimizer**) to guard sewing line allocations against material stockouts.

---

## 3. Mathematical Formulations

The optimization engine implements a deterministic 10-step pipeline:

### 3.1 Non-Linear Disruption Risk Factor ($RF$)
$$\text{Risk Factor} = 1 + \left( P_{\text{disrupt}} \times \left(1 - \frac{\text{Trust}}{100}\right) \right)$$
*Where $P_{\text{disrupt}} \in [0, 1]$ is upstream disruption probability, and $\text{Trust} \in [0, 100]$ is the supplier trust rating.*

### 3.2 Risk-Adjusted Expected Lead Time ($L_{\text{adj}}$)
$$L_{\text{adj}} = \bar{L} \times \text{Risk Factor}$$
*Extends the nominal lead time $\bar{L}$ dynamically to account for port and transit delays.*

### 3.3 Kingman Stochastic Dual-Variance Safety Stock ($SS$)
$$SS = Z \times \sqrt{L_{\text{adj}} \cdot \sigma_D^2 + \bar{D}^2 \cdot \sigma_L^2}$$
*Where:*
- $Z$ is the standard normal deviate corresponding to the configured cycle service level (e.g., $Z=1.645$ for $95\%$).
- $\sigma_D$ is the demand standard deviation.
- $\sigma_L$ is the lead time standard deviation.
- $\bar{D}$ is the forecasted average daily demand.

### 3.4 Dynamic Reorder Point ($ROP$)
$$ROP = (\bar{D} \times L_{\text{adj}}) + SS$$
*Triggers replenishment orders whenever the inventory position ($\text{On-Hand} + \text{In-Transit}$) falls below $ROP$.*

### 3.5 Dynamic Reorder Quantity ($ROQ$)
$$ROQ = \bar{D} \times T_{\text{cycle}} \times \text{Risk Factor}$$
*Provides periodic-review demand coverage over cycle days $T_{\text{cycle}}$, scaled proportionally by disruption severity.*

### 3.6 Material Shortage & Availability
$$\text{Shortage} = \max(0, \bar{D} - \text{On-Hand})$$
$$\text{Availability Flag} = (\text{Shortage} == 0)$$

---

## 4. Policy Comparison & Theoretical Justification

We evaluate three distinct inventory control paradigms:

| Policy Paradigm | Description | Mathematical Safety Stock | Upstream Risk Coupling |
| :--- | :--- | :--- | :--- |
| **Policy A: Static $(s, S)$ Baseline** | Fixed order-point order-up-to level based on historical averages. | $SS = Z \cdot \sigma_D \sqrt{\bar{L}}$ | None ($P_{\text{disrupt}} = 0$) |
| **Policy B: Standard Adaptive** | Dynamic Kingman safety stock responding to demand variation only. | $SS = Z \sqrt{\bar{L}\sigma_D^2 + \bar{D}^2\sigma_L^2}$ | None (Nominal lead time) |
| **Policy C: OPTICHAIN Disruption-Aware** | Complete non-linear risk factor scaling with dual-variance Kingman buffer and trust penalty. | $SS = Z \sqrt{L_{\text{adj}}\sigma_D^2 + \bar{D}^2\sigma_L^2}$ | **Full coupling** ($P_{\text{disrupt}}$, Trust, Scenario) |

*Why EOQ was intentionally excluded:* Classic Wilson EOQ assumes static demand, stationary holding cost rates ($H$), and fixed ordering costs ($S$), none of which hold true in rapid-cycle Sri Lankan apparel supply chains with fluctuating air/sea freight rates.

---

## 5. Experimental Results & Empirical Verification

Simulations conducted across **171,962 historical orders** from the DataCo Global Smart Supply Chain benchmark dataset yielded the following performance metrics:

### 5.1 Simulation Benchmark Summary

| Evaluation Metric | Policy A: Static $(s,S)$ | Policy B: Standard Adaptive | Policy C: OPTICHAIN (Proposed) | Absolute Change ($B \to C$) | Relative Improvement |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Service Level (%)** | $99.9988\%$ | $99.4624\%$ | **$99.9567\%$** | $+0.4943\text{ pp}$ | $+0.50\%$ |
| **Stockout Rate (%)** | $0.0012\%$ | $0.5376\%$ | **$0.0433\%$** | $-0.4943\text{ pp}$ | $-91.95\%$ |
| **Stockout Units** | $4.36$ | $1,994.05$ | **$160.45$** | $-1,833.60\text{ units}$ | **$-91.95\%$** |
| **Average Inventory (units)** | $62.70$ | $45.43$ | $77.70$ | $+32.27\text{ units}$ | $+71.01\%$ |
| **Replenishment Orders** | $2,916$ | $6,415$ | $6,478$ | $+63\text{ orders}$ | $+0.98\%$ |
| **Fulfilled Demand (units)** | $370,941.64$ | $368,951.95$ | $370,785.55$ | $+1,833.60\text{ units}$ | $+0.50\%$ |

### 5.2 Resilience Trade-off Discussion
Policy C achieves a **$91.95\%$ reduction in stockout units** and restores the service level to $99.96\%$ in exchange for a **$+71.01\%$ buffer expansion** in average inventory holdings. In garment manufacturing, where an unmitigated $\$500$ fabric stockout causes tens of thousands in idle sewing line downtime, this trade-off represents a commercially sound and defensible operational strategy.

---

## 6. Auxiliary Machine Learning: XGBoost Backorder Classifier

To provide an orthogonal operational risk signal alongside mathematical buffer calculation, a gradient boosted decision tree classifier was trained to predict the likelihood of supplier backorders.

- **Training Records:** $1,687,860$ industrial transactions (`Training_BOP.csv`)
- **Evaluation Records:** $242,076$ test instances (`Testing_BOP.csv`)
- **Model Artifact:** `research/inventory-optimization/models/OptiChain_Backorder_XGBoost.json`

### Performance Metrics on Unseen Test Split

| Metric | Score | Analytical Interpretation |
| :--- | :---: | :--- |
| **ROC-AUC** | **$0.9059$** | Excellent discriminatory power separating backorder risk tiers. |
| **PR-AUC** | **$0.1797$** | Substantial precision under extreme class imbalance ($\approx 1.1\%$ positive instances). |
| **Decision Threshold** | $0.90$ | Calibrated to minimize costly false alarms in procurement dispatch. |
| **Test Accuracy** | $98.66\%$ | High baseline driven by true negative density. |
| **F1-Score** | $0.2269$ | Harmonic mean at optimal precision/recall trade-off point. |

---

## 7. System Architecture & Upstream/Downstream Contracts

```
[Module 1: Market Prophet] ────┐
(dummy_demand_forecasts.csv)   │
                               ▼
                       [mock_upstream.py]
                               │
[Module 2: Procurement] ───────┤
(dummy_supplier_risk.csv)      ▼
                   [app/ml/inventory/inventory_optimizer.py]
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
 [FastAPI Service Layer]                [SQLite Database]
 (12 REST Endpoints @ :8000)            (optichain_inventory.db)
             │
             ├──► [React 19 Dashboard @ :5173] (Bento UI, What-If Simulator)
             │
             └──► [GET /api/inventory/production-interface]
                                 │
                                 ▼
                     [Module 4: Line Optimizer]
                     (Sewing line reallocation)
```

For a local presentation, the FastAPI endpoint `GET /api/inventory/demo-upstream`
joins Module 1 demand and Module 2 supplier-risk CSV records by `product_id`.
Open `http://localhost:8000/docs`, run `GET /api/inventory/demo-upstream`, or
open `http://localhost:8000/api/inventory/demo-upstream` directly to inspect
the combined demo records. In **Add Raw Material**, enter a feed SKU such as
`FAB-009` and choose **Load demo Module 1 + 2 data by SKU**. This fills the
forecast and supplier-risk fields from the CSVs; enter current on-hand stock
separately because it is not provided by either upstream feed. Then save the SKU
and run optimization. All values in these files are synthetic presentation data.

### Upstream Integration Mode
- `UPSTREAM_DATA_MODE="DEMO"` (Default): Feeds deterministic synthetic profiles for 8 MAS factory materials.
- `UPSTREAM_DATA_MODE="INTEGRATED"`: Directly ingests live REST endpoints from peer microservices.

---

## 8. Reproduction Instructions

### 8.1 Backend Test Suite Execution
```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/ -v
```
*(All 27 automated tests cover mathematical formulas, boundary conditions, edge cases, and REST endpoints).*

### 8.2 Launching the Application
```powershell
# Terminal 1: FastAPI Backend
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: React Frontend
cd frontend
npm run dev
```

---

## 9. Known Limitations
1. **Synthetic Sourcing Identifiers:** Vendor IDs and origin nodes are demonstration proxies based on Sri Lankan apparel trade routes (Colombo, Nhava Sheva, Ningbo, Hai Phong).
2. **Auxiliary Model Role:** XGBoost predictions serve as alert signals; inventory buffer sizing is strictly governed by stochastic Kingman formulations.
3. **Periodic Review Horizon:** Reorder points assume fixed weekly or bi-weekly review cycles rather than continuous automated warehouse sensor telemetry.

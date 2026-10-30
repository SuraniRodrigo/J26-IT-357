# Module 2: AI-Based Supplier Risk Profiling & Supply Disruption Prediction ("Procurement Guardian")
**OptiChain: AI-Driven Supply Chain Disruption Predictor & Line Optimizer for Sri Lankan Garment Factories**  
**Researcher / Developer:** Herath H.M.C.P. (IT23186538)  
**Academic Context:** Final Year Research Project, SLIIT  
**Branch:** `AI_Based_Supplier_Risk_Profiling_And_Supply_Disruption_Module`  

---

## 1. Executive Summary & Research Problem

In export apparel manufacturing hubs such as Sri Lanka (e.g., MAS Holdings, Brandix), garment factories depend heavily on international suppliers for the timely delivery of raw materials (fabrics, specialty dyes, zippers, buttons). Over 70% of raw materials used in Sri Lankan garment manufacturing are imported across maritime corridors (India, China, Vietnam, Singapore).

Traditional procurement and supplier management systems operate under severe operational vulnerabilities:
1. **Reactive Monitoring:** Existing tools identify supplier delays or shipment backlogs only after they occur, leaving factory managers unprepared for incoming raw material shortages.
2. **Inflexible Risk Indicators:** Static vendor ratings fail to account for real-time transit variances, feeder port congestion (Colombo, Chittagong, Singapore), and seasonal weather disruptions (Yala and Maha monsoon seasons).
3. **Downstream Sewing Line Halts:** Undetected supplier delays cause fabric stockouts at the warehouse, directly idling multimillion-dollar sewing lines and leading to severe financial penalties from international buyers.

---

## 2. Research Objective

To develop, mathematically validate, and deploy an **AI-Driven Supplier Risk Profiling and Early Warning Engine** that:
- Ingests historical operational supply chain records to predict supplier late delivery risks before orders arrive.
- Trains and evaluates supervised machine learning models to maximize **Recall (100%)**, ensuring zero false negatives for late deliveries.
- Formulates a **Hybrid Risk Engine** combining machine learning baseline predictions with real-time transit delay penalties and seasonal monsoon risk adjustments.
- Computes a dynamic, bounded **Supplier Trust Score** (`Trust = 100 - Risk`) for transparent procurement decision-making.
- Exposes upstream risk telemetry endpoints (`/api/supply/latest-risk`) to trigger automated downstream safety stock expansion (+35%) in Module 3 (**Inventory Guardian**).

---

## 3. Mathematical & Algorithmic Formulations

The Procurement Guardian engine implements a deterministic 5-step risk quantification pipeline:

### 3.1 Machine Learning Base Risk (R_ML)

`R_ML = P(Late Delivery = 1 | X_supplier)`

*Where `X_supplier` represents the 29-feature engineered vector including transit variance, shipping mode, category ID, and regional trade indicators output by the trained XGBoost model.*

### 3.2 Dynamic Transit Delay Penalty (P_delay)

`P_delay = max(0, Delta_days) * 18.5%`

*Where `Delta_days = Real Transit Days - Scheduled Transit Days`, applying a `+18.5%` risk penalty per expected day of transit delay.*

### 3.3 Seasonal Monsoon Penalty (P_monsoon)

`P_monsoon = 20.0% (if Month in [May, Jun, Oct, Nov]) else 0.0%`

*Accounts for maritime feeder port congestion during the Sri Lankan Yala and Maha monsoon periods.*

### 3.4 Hybrid Risk Score Formulation (R_final)

`Final Risk Score = min(98.5%, max(3.5%, R_ML + P_delay + P_monsoon))`

*Clamps the final composite risk percentage strictly within the operational boundary of `[3.5%, 98.5%]`.*

### 3.5 Bounded Supplier Trust Score (T_score)

`Trust Score = 100.0 - Final Risk Score`

*Establishes a strict inverse relationship where higher risk directly penalizes supplier trust rating.*

---

## 4. Machine Learning Model Benchmark & Evaluation

Multiple classification algorithms were benchmarked on **180,519 historical supply chain records** from the DataCo Global Supply Chain benchmark dataset:

### 4.1 Model Comparison & Performance Summary

| Model Architecture | Accuracy | ROC-AUC | Recall (Late Class) | Inference Latency | Selection Rationale |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **XGBoost Classifier (Selected)** | **97.58%** | **97.59%** | **100.00%** | **< 10 ms** | **Optimal: Zero False Negatives & Lowest Latency** |
| **LightGBM Classifier** | 96.82% | 96.90% | 98.40% | < 12 ms | High performance, slight recall drop |
| **CatBoost Classifier** | 96.50% | 96.75% | 97.90% | < 25 ms | Higher inference latency |
| **Random Forest** | 94.10% | 94.30% | 95.10% | < 35 ms | Sub-optimal precision/recall balance |
| **Logistic Regression Baseline** | 78.40% | 79.10% | 75.20% | < 5 ms | High false negative rate |

### 4.2 Why 100% Recall Over Precision?
In apparel manufacturing, an undetected supplier delay (**False Negative**) results in an unexpected raw material stockout, idling a $50,000/day sewing line. Conversely, a **False Positive** merely triggers a low-cost routine inventory stock verification or buffer expansion in Module 3. Therefore, hyperparameter tuning was optimized strictly to achieve **100% Recall** for late delivery detection.

---
## 5. System Architecture & Upstream/Downstream Contracts

```text
[DataCo Historical Dataset] ──► [Google Colab Training Pipeline] ──► [xgboost_supplier_risk_model.pkl]
                                                                                │
                                                                                ▼
[Live Port Telemetry] ────────► [FastAPI Backend Service Layer] ◄────── [@lru_cache (RAM)]
(Colombo/Singapore/Chittagong)  (app/services/supply/supply_service.py)
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
   [GET /api/supply/latest-risk]                                 [PDF Export Engine]
                 │                                               (ReportLab In-Memory <40ms)
                 ▼                                                             │
  [Module 3: Inventory Guardian]                                               ▼
  (+35% Safety Stock Auto-Expansion)                           [React 19 Dashboard UI]

```
## 6. Technical Implementation & Backend Optimization

- **In-Memory LRU Cache:** The serialized XGBoost pipeline (`xgboost_supplier_risk_model.pkl`) is loaded warm into RAM using `@lru_cache(maxsize=1)` in `supply_service.py`, eliminating per-request disk read I/O to achieve sub-10ms inference latency.
- **High-Speed ReportLab PDF Generation:** Generates landscape A4 executive supplier risk evaluation reports directly in-memory using native vector byte streams in **< 40 ms**, avoiding resource-heavy browser engines like Puppeteer.
- **Cold-Start Category Fallback Hasher:** For unseen raw material SKUs or new suppliers, a dynamic hash function `(abs(hash(name)) % 45) + 1` maps inputs to regional trade-lane baseline features.

---

## 7. Reproduction Instructions

### Terminal 1: FastAPI Backend
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

### Terminal 2: React Frontend
cd frontend
npm run dev


---

## 9. Current Implementation Progress

The core deliverables for **Module 2: Procurement Guardian** have been fully developed and validated:

- [x] **XGBoost ML Risk Engine:** Trained on 180,519 DataCo operational records, achieving 97.59% ROC-AUC and 100% Recall for late delivery detection.
- [x] **Hybrid Risk Scoring Model:** Integrated dynamic transit delay penalties (+18.5%/day) and seasonal monsoon adjustments (+20%) into a bounded composite score.
- [x] **High-Speed FastAPI Backend:** Implemented REST service layer with `@lru_cache` optimization delivering sub-10ms inference latency.
- [x] **In-Memory Executive PDF Export:** Integrated ReportLab engine generating landscape supplier evaluation reports in <40ms.
- [x] **Module 3 Downstream Integration:** Configured `/api/supply/latest-risk` endpoint to trigger automated +35% safety stock expansion in Inventory Guardian.
- [x] **Interactive React 19 Dashboard:** Built real-time UI components with supplier risk telemetry, filters, and PDF download triggers.

---

## 10. Future Work & Roadmap

To further scale the system beyond the current research scope, the following enhancements are planned:

- [ ] **Live IoT & Maritime Telemetry Integration:** Connect real-time AIS vessel tracking APIs (e.g., MarineTraffic) for automated port congestion detection.
- [ ] **Multi-Tier Supplier Risk Mapping:** Expand risk profiling from primary (Tier 1) suppliers down to raw fabric mills and dye houses.
- [ ] **NLP News & Weather Sentiment Analyzer:** Integrate web scrapers to parse global trade news and weather warnings for proactive disruption alerts.
- [ ] **Automated Supplier Re-Routing:** Implement recommendation algorithms to suggest pre-vetted alternative vendors when a supplier's Trust Score drops below 50%.

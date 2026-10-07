from __future__ import annotations

import csv
import os
from dataclasses import dataclass
from datetime import date
from typing import Literal

UPSTREAM_DATA_MODE: Literal["DEMO", "INTEGRATED"] = os.getenv("UPSTREAM_DATA_MODE", "DEMO")
DEMO_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "inventory-optimization", "datasets", "demo")
)


@dataclass
class UpstreamDemandSignal:
    product_id: str
    product_name: str
    category: str
    unit: str
    forecast_date: date
    forecast_horizon_days: int
    forecasted_demand: float
    demand_std_dev: float
    demand_uncertainty_pct: float
    historical_daily_mean: float
    historical_daily_std: float
    is_demo_data: bool = True
    data_source_label: str = "DEMO UPSTREAM DATA (Module 1: Market Prophet)"


@dataclass
class UpstreamSupplierRiskSignal:
    product_id: str
    demo_supplier_id: str
    demo_supplier_name: str
    supplier_origin_country: str
    average_lead_time_days: float
    lead_time_std_dev_days: float
    disruption_probability: float
    supplier_trust_score: float
    risk_level: str
    disruption_scenario: str
    is_demo_data: bool = True
    data_source_label: str = "DEMO UPSTREAM DATA (Module 2: Procurement Guardian)"


@dataclass
class CombinedUpstreamRecord:
    product_id: str
    product_name: str
    category: str
    unit: str
    forecast_date: date
    forecasted_demand: float
    demand_std_dev: float
    disruption_probability: float
    supplier_trust_score: float
    average_lead_time: float
    lead_time_std_dev: float
    risk_level: str
    is_demo_data: bool = True
    upstream_mode: str = UPSTREAM_DATA_MODE


def _load_csv_records(filename: str) -> list[dict[str, str]]:
    path = os.path.join(DEMO_DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def get_mock_demand_forecast(product_id: str) -> UpstreamDemandSignal:
    """Fetch mock demand forecast for a given product from the demo dataset."""
    records = _load_csv_records("dummy_demand_forecasts.csv")
    for r in records:
        if r["product_id"].upper() == product_id.upper():
            return UpstreamDemandSignal(
                product_id=r["product_id"],
                product_name=r["product_name"],
                category=r["category"],
                unit=r["unit"],
                forecast_date=date.fromisoformat(r["forecast_date"]),
                forecast_horizon_days=int(r["forecast_horizon_days"]),
                forecasted_demand=float(r["forecasted_demand"]),
                demand_std_dev=float(r["demand_std_dev"]),
                demand_uncertainty_pct=float(r["demand_uncertainty_pct"]),
                historical_daily_mean=float(r["historical_daily_mean"]),
                historical_daily_std=float(r["historical_daily_std"]),
                is_demo_data=True,
            )

    # Fallback synthetic record if unknown SKU
    return UpstreamDemandSignal(
        product_id=product_id,
        product_name=f"Demo Garment Material ({product_id})",
        category="General Materials",
        unit="units",
        forecast_date=date.today(),
        forecast_horizon_days=14,
        forecasted_demand=5000.0,
        demand_std_dev=750.0,
        demand_uncertainty_pct=0.15,
        historical_daily_mean=357.0,
        historical_daily_std=53.0,
        is_demo_data=True,
    )


def get_mock_supplier_risk(product_id: str) -> UpstreamSupplierRiskSignal:
    """Fetch mock supplier disruption risk for a given product from the demo dataset."""
    records = _load_csv_records("dummy_supplier_risk_scores.csv")
    for r in records:
        if r["product_id"].upper() == product_id.upper():
            return UpstreamSupplierRiskSignal(
                product_id=r["product_id"],
                demo_supplier_id=r["demo_supplier_id"],
                demo_supplier_name=r["demo_supplier_name"],
                supplier_origin_country=r["supplier_origin_country"],
                average_lead_time_days=float(r["average_lead_time_days"]),
                lead_time_std_dev_days=float(r["lead_time_std_dev_days"]),
                disruption_probability=float(r["disruption_probability"]),
                supplier_trust_score=float(r["supplier_trust_score"]),
                risk_level=r["risk_level"],
                disruption_scenario=r["disruption_scenario"],
                is_demo_data=True,
            )

    # Fallback synthetic supplier risk
    return UpstreamSupplierRiskSignal(
        product_id=product_id,
        demo_supplier_id="DEMO-SUP-999",
        demo_supplier_name="Demo Global Logistics Hub",
        supplier_origin_country="International",
        average_lead_time_days=7.0,
        lead_time_std_dev_days=2.0,
        disruption_probability=0.35,
        supplier_trust_score=70.0,
        risk_level="MEDIUM",
        disruption_scenario="Synthetic Standard Disruption",
        is_demo_data=True,
    )


def get_combined_upstream_signal(product_id: str) -> CombinedUpstreamRecord:
    """Combines demand forecast and supplier risk signals."""
    demand = get_mock_demand_forecast(product_id)
    risk = get_mock_supplier_risk(product_id)
    return CombinedUpstreamRecord(
        product_id=demand.product_id,
        product_name=demand.product_name,
        category=demand.category,
        unit=demand.unit,
        forecast_date=demand.forecast_date,
        forecasted_demand=demand.forecasted_demand,
        demand_std_dev=demand.demand_std_dev,
        disruption_probability=risk.disruption_probability,
        supplier_trust_score=risk.supplier_trust_score,
        average_lead_time=risk.average_lead_time_days,
        lead_time_std_dev=risk.lead_time_std_dev_days,
        risk_level=risk.risk_level,
        is_demo_data=True,
        upstream_mode=UPSTREAM_DATA_MODE,
    )


def list_all_mock_products() -> list[CombinedUpstreamRecord]:
    """Lists all available products with mock upstream feeds."""
    demand_records = _load_csv_records("dummy_demand_forecasts.csv")
    return [get_combined_upstream_signal(r["product_id"]) for r in demand_records]

from __future__ import annotations

import os
import httpx
from typing import Literal, List
from datetime import date
from dataclasses import dataclass

# Environment variables specifying real upstream service URLs
MODULE1_URL = os.getenv("MODULE1_URL", "http://localhost:8001")  # Demand Forecasting Service
MODULE2_URL = os.getenv("MODULE2_URL", "http://localhost:8002")  # Supply Disruption Service

# Reuse the same dataclasses as mock for compatibility
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
    is_demo_data: bool = False
    upstream_mode: str = "INTEGRATED"

def _fetch_json(url: str) -> dict:
    """Simple httpx GET wrapper that raises on non‑200 status."""
    try:
        resp = httpx.get(url, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch upstream data from {url}: {exc}")

def get_combined_upstream_signal(product_id: str) -> CombinedUpstreamRecord:
    """Calls real Module 1 and Module 2 services and merges their payloads.

    Expected endpoints (example):
    - `{MODULE1_URL}/forecast/{product_id}` returning dict with keys:
        product_id, product_name, category, unit, forecast_date (ISO),
        forecasted_demand, demand_std_dev
    - `{MODULE2_URL}/risk/{product_id}` returning dict with keys:
        disruption_probability, supplier_trust_score, average_lead_time,
        lead_time_std_dev, risk_level
    """
    # Fetch demand forecast
    demand_payload = _fetch_json(f"{MODULE1_URL}/forecast/{product_id}")
    # Fetch supplier risk
    risk_payload = _fetch_json(f"{MODULE2_URL}/risk/{product_id}")

    # Merge into CombinedUpstreamRecord
    return CombinedUpstreamRecord(
        product_id=demand_payload["product_id"],
        product_name=demand_payload.get("product_name", ""),
        category=demand_payload.get("category", ""),
        unit=demand_payload.get("unit", ""),
        forecast_date=date.fromisoformat(demand_payload["forecast_date"]),
        forecasted_demand=float(demand_payload["forecasted_demand"]),
        demand_std_dev=float(demand_payload["demand_std_dev"]),
        disruption_probability=float(risk_payload["disruption_probability"]),
        supplier_trust_score=float(risk_payload["supplier_trust_score"]),
        average_lead_time=float(risk_payload["average_lead_time"]),
        lead_time_std_dev=float(risk_payload["lead_time_std_dev"]),
        risk_level=risk_payload.get("risk_level", "MEDIUM"),
    )

def list_all_upstream_products() -> List[CombinedUpstreamRecord]:
    """Retrieves a list of all product IDs from Module 1 and builds combined records.
    This endpoint assumes Module 1 can list available SKUs via `/products`.
    """
    product_list = _fetch_json(f"{MODULE1_URL}/products")  # Expected list of dicts with at least product_id
    records: List[CombinedUpstreamRecord] = []
    for prod in product_list:
        pid = prod["product_id"]
        try:
            records.append(get_combined_upstream_signal(pid))
        except Exception as exc:
            # Log and skip problematic items – fallback to demo is not attempted here
            continue
    return records

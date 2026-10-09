from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass
class ProductEntity:
    product_id: str
    product_name: str
    category: str
    unit: str
    default_lead_time_days: float = 3.5
    default_lead_time_std: float = 1.62
    default_demand_std: float = 38.87
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class InventorySnapshotEntity:
    product_id: str
    snapshot_date: date
    current_inventory: float
    inventory_position: float
    in_transit_qty: float = 0.0
    minimum_inventory: float = 0.0
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class InventoryDecisionEntity:
    product_id: str
    decision_date: date
    forecasted_demand: float
    disruption_probability: float
    supplier_trust_score: float
    risk_adjusted_lead_time: float
    safety_stock: float
    reorder_point: float
    reorder_quantity: float
    material_requirement: float
    material_shortage: float
    availability_flag: bool
    risk_level: str
    recommendation: str
    model_version: str = "inventory-policy-v1.0"
    backorder_risk: float = 0.0
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class InventoryPolicyEntity:
    policy_name: str
    service_level: float = 0.95
    z_value: float = 1.645
    replenishment_cycle_days: int = 7
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ModelRunEntity:
    model_name: str
    model_version: str
    run_date: datetime = field(default_factory=datetime.utcnow)
    metrics: dict[str, Any] = field(default_factory=dict)
    artifact_location: str = "backend/models_artifacts/inventory/OptiChain_Backorder_XGBoost_Model.joblib"


@dataclass
class IntegrationEventEntity:
    event_type: str
    source_module: str = "Module 3: Inventory Guardian"
    target_module: str = "Module 4: Line Optimizer"
    payload: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class InventoryOptimizationArtifact:
    model_name: str = "OptiChain_Backorder_XGBoost_Model"
    model_version: str = "backorder-xgb-v1.0"
    optimization_type: str = "disruption_aware_inventory_policy"
    enabled: bool = True

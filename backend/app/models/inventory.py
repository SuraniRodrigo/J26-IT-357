from __future__ import annotations

from dataclasses import dataclass


@dataclass
class InventoryOptimizationArtifact:
    model_name: str
    model_version: str
    optimization_type: str = "risk_aware_inventory_policy"
    enabled: bool = True

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ProductionOptimizationArtifact:
    model_name: str
    model_version: str
    scheduling_mode: str = "self_healing"
    enabled: bool = True

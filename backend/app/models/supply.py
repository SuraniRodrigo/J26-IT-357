from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SupplyRiskArtifact:
    model_name: str
    model_version: str
    risk_threshold: float = 0.5
    prediction_type: str = "disruption_probability"

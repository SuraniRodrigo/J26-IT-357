from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass
class DemandForecastArtifact:
    model_name: str
    model_version: str
    forecast_horizon_days: int
    training_period_start: date | None = None
    training_period_end: date | None = None

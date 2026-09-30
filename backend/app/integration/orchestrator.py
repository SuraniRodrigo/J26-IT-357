from __future__ import annotations

from app.integration.pipeline import run_optichain_pipeline
from app.schemas.integration import OptiChainPipelineRequest, OptiChainPipelineResponse


class OptiChainOrchestrator:
    def __init__(self) -> None:
        self.pipeline = run_optichain_pipeline

    def run(self, request: OptiChainPipelineRequest) -> OptiChainPipelineResponse:
        return self.pipeline(request)

    def dashboard_summary(self) -> dict:
        return {
            "system": "OPTICHAIN",
            "status": "ready_for_model_integration",
            "modules": [
                "demand_forecasting",
                "supply_disruption",
                "inventory_optimization",
                "production_optimization",
            ],
        }

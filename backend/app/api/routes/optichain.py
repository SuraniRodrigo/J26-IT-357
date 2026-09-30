from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.integration.orchestrator import OptiChainOrchestrator
from app.schemas.integration import OptiChainPipelineRequest, OptiChainPipelineResponse

router = APIRouter(tags=["optichain"])
orchestrator = OptiChainOrchestrator()


@router.post("/optichain/run", response_model=OptiChainPipelineResponse)
def run_optichain(request: OptiChainPipelineRequest) -> OptiChainPipelineResponse:
    try:
        return orchestrator.run(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

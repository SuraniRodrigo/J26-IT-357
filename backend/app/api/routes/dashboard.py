from __future__ import annotations

from fastapi import APIRouter

from app.integration.orchestrator import OptiChainOrchestrator

router = APIRouter(tags=["dashboard"])
orchestrator = OptiChainOrchestrator()


@router.get("/dashboard/summary")
def dashboard_summary() -> dict:
    return orchestrator.dashboard_summary()


@router.get("/dashboard/inventory-status")
def inventory_status() -> dict:
    return {"status": "not_available", "message": "Inventory model artifacts are not available in the current repository."}


@router.get("/dashboard/production-status")
def production_status() -> dict:
    return {"status": "not_available", "message": "Production optimization artifacts are not available in the current repository."}

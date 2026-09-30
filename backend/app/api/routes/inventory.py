from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.inventory import InventoryOptimizationRequest, InventoryPolicySchema
from app.services.inventory_service import optimize_inventory

router = APIRouter(tags=["inventory"])


@router.post("/inventory/optimize", response_model=list[InventoryPolicySchema])
def inventory_optimize(request: InventoryOptimizationRequest) -> list[InventoryPolicySchema]:
    try:
        return optimize_inventory(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

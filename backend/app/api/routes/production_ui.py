from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.production_ui import (
    DisruptionCreateRequest,
    DisruptionResponse,
    RecoveryPlanCreateRequest,
    RecoveryPlanResponse,
    ScheduleResponse,
    SimulationCreateRequest,
    SimulationResponse,
)
from app.services.production_ui_service import production_ui_service

router = APIRouter(prefix="/production-ui", tags=["production UI"])


@router.get("/dashboard")
def production_dashboard() -> dict[str, object]:
    return production_ui_service.dashboard()


@router.get("/disruptions", response_model=list[DisruptionResponse])
def list_disruptions() -> list[DisruptionResponse]:
    return production_ui_service.list_disruptions()


@router.post(
    "/disruptions",
    response_model=DisruptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_disruption(request: DisruptionCreateRequest) -> DisruptionResponse:
    return production_ui_service.create_disruption(request)


@router.post(
    "/disruptions/{disruption_id}/resolve",
    response_model=DisruptionResponse,
)
def resolve_disruption(disruption_id: str) -> DisruptionResponse:
    try:
        return production_ui_service.resolve_disruption(disruption_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/simulations", response_model=list[SimulationResponse])
def list_simulations() -> list[SimulationResponse]:
    return production_ui_service.list_simulations()


@router.post(
    "/simulations",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_simulation(request: SimulationCreateRequest) -> SimulationResponse:
    return production_ui_service.run_simulation(request)


@router.post(
    "/recovery-plans",
    response_model=RecoveryPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_recovery_plan(request: RecoveryPlanCreateRequest) -> RecoveryPlanResponse:
    try:
        return production_ui_service.create_recovery_plan(request)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/recovery-plans/{plan_id}", response_model=RecoveryPlanResponse)
def get_recovery_plan(plan_id: str) -> RecoveryPlanResponse:
    try:
        return production_ui_service.get_recovery_plan(plan_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/recovery-plans/{plan_id}/apply",
    response_model=RecoveryPlanResponse,
)
def apply_recovery_plan(plan_id: str) -> RecoveryPlanResponse:
    try:
        return production_ui_service.apply_recovery_plan(plan_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/schedule", response_model=ScheduleResponse)
def get_production_schedule() -> ScheduleResponse:
    return production_ui_service.get_schedule()


@router.post("/schedule/rollback", response_model=ScheduleResponse)
def rollback_production_schedule() -> ScheduleResponse:
    try:
        return production_ui_service.rollback_schedule()
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

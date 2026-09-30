from __future__ import annotations

from app.schemas.supply import SupplyRiskRequest, SupplyRiskSchema


def predict_supply_risk(request: SupplyRiskRequest) -> list[SupplyRiskSchema]:
    return [
        SupplyRiskSchema(
            supplier_id=request.supplier_id,
            vendor_id=request.vendor_id,
            disruption_probability=None,
            risk_level=None,
            risk_signal="No trained disruption model artifact is present in the current repository. Model output is unavailable.",
            model_version=request.model_version or "not-available",
        )
    ]

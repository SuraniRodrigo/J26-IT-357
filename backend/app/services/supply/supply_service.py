from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import re

import joblib
import pandas as pd

from app.schemas.supply import SupplyPredictionRequest, SupplyPredictionResponse


MODEL_PATH = (
    Path(__file__).resolve().parents[3]
    / "models_artifacts"
    / "supply"
    / "xgboost_supplier_risk_model.pkl"
)


@lru_cache(maxsize=1)
def _load_model():
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Supply risk model artifact not found: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def _normalize_feature_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _expected_feature_names(model) -> list[str]:
    feature_names = getattr(model, "feature_names_in_", None)
    if feature_names is not None:
        return [str(name) for name in feature_names]

    get_booster = getattr(model, "get_booster", None)
    if get_booster is not None:
        feature_names = get_booster().feature_names
        if feature_names is not None:
            return [str(name) for name in feature_names]

    raise RuntimeError("Supply risk model does not expose its trained feature names")


CATEGORY_NAME_MAP: dict[str, int] = {
    "knitted fabric": 17,
    "organic cotton denim fabric": 17,
    "cotton": 17,
    "denim": 18,
    "woven fabric": 24,
    "accessories": 34,
    "trims": 12,
    "yarn": 12,
    "apparel": 17,
    "dresses": 17,
}


def _resolve_category_id(request: SupplyPredictionRequest) -> int:
    if request.category_id is not None:
        return request.category_id
    cat_lower = request.category_name.strip().lower()
    if cat_lower in CATEGORY_NAME_MAP:
        return CATEGORY_NAME_MAP[cat_lower]
    return (abs(hash(cat_lower)) % 45) + 1


def _build_model_input(
    request: SupplyPredictionRequest, model
) -> tuple[pd.DataFrame, int, int]:
    actual_shipping_days = request.scheduled_shipping_days + request.expected_delay_days
    shipping_variance = request.expected_delay_days
    category_id = _resolve_category_id(request)

    raw_features = pd.DataFrame(
        [
            {
                "Days for shipping (real)": actual_shipping_days,
                "Days for shipment (scheduled)": request.scheduled_shipping_days,
                "Shipping_Variance": shipping_variance,
                "Category Id": category_id,
                "Shipping Mode": request.shipping_mode,
                "Order Region": request.order_region,
            }
        ]
    )
    encoded_features = pd.get_dummies(
        raw_features,
        columns=["Shipping Mode", "Order Region"],
        dtype=int,
    )

    expected_names = _expected_feature_names(model)
    normalized_features = {
        _normalize_feature_name(str(name)): name
        for name in encoded_features.columns
    }
    aligned_features = pd.DataFrame(
        0,
        index=[0],
        columns=expected_names,
        dtype=int,
    )
    for expected_name in expected_names:
        feature_name = normalized_features.get(_normalize_feature_name(expected_name))
        if feature_name is not None:
            aligned_features[expected_name] = encoded_features[feature_name].astype(int)

    return aligned_features, shipping_variance, actual_shipping_days


def predict_supply_risk(
    request: SupplyPredictionRequest,
) -> SupplyPredictionResponse:
    model = _load_model()
    model_input, shipping_variance, actual_shipping_days = _build_model_input(request, model)
    probabilities = model.predict_proba(model_input)[0]

    classes = getattr(model, "classes_", None)
    positive_class_index = list(classes).index(1) if classes is not None and 1 in classes else -1
    raw_disruption_prob = float(probabilities[positive_class_index])
    raw_risk_score = raw_disruption_prob * 100.0

    # 1. Delay penalty: +18.5% risk per day of expected delay (additive, not multiplicative)
    delay_days = request.expected_delay_days
    delay_penalty = delay_days * 18.5

    # 2. Monsoon/Seasonal penalty: +20% flat during high-disruption months (5, 6, 10, 11)
    is_monsoon_month = request.month in (5, 6, 10, 11)
    monsoon_penalty = 20.0 if is_monsoon_month else 0.0

    # 3. Final risk: clamp to [3.5, 98.5] so it's never trivially 0% or 100%
    calculated_risk = min(98.5, max(3.5, raw_risk_score + delay_penalty + monsoon_penalty))
    risk_score = round(calculated_risk, 2)

    # 4. Strict inverse trust score
    trust_score = round(100.0 - risk_score, 2)

    if risk_score >= 70.0:
        risk_level = "high"
    elif risk_score >= 35.0:
        risk_level = "medium"
    else:
        risk_level = "low"

    early_warning_alert = risk_score >= 50.0

    if delay_days > 0:
        delay_impact_description = (
            f"{delay_days} day(s) expected delay detected. "
            f"Real transit time extends from {request.scheduled_shipping_days} to {actual_shipping_days} days "
            f"(+{round(delay_penalty, 1)}% disruption penalty applied)."
        )
    else:
        delay_impact_description = (
            f"On-time schedule ({request.scheduled_shipping_days} days). No delay penalty applied."
        )

    return SupplyPredictionResponse(
        status="success",
        product_name=request.product_name,
        supplier_name=request.supplier_name,
        category_name=request.category_name,
        year=request.year,
        month=request.month,
        scheduled_shipping_days=request.scheduled_shipping_days,
        expected_delay_days=request.expected_delay_days,
        actual_shipping_days=actual_shipping_days,
        shipping_variance=shipping_variance,
        risk_score=risk_score,
        trust_score=trust_score,
        risk_level=risk_level,
        disruption_probability_percent=risk_score,
        supplier_trust_score=trust_score,
        early_warning_alert=early_warning_alert,
        seasonal_risk_applied=is_monsoon_month,
        delay_impact_description=delay_impact_description,
    )
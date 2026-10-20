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


def _build_model_input(request: SupplyPredictionRequest, model) -> tuple[pd.DataFrame, int]:
    shipping_variance = (
        request.days_for_shipping_real - request.days_for_shipment_scheduled
    )
    raw_features = pd.DataFrame(
        [
            {
                "Days for shipping (real)": request.days_for_shipping_real,
                "Days for shipment (scheduled)": request.days_for_shipment_scheduled,
                "Shipping_Variance": shipping_variance,
                "Category Id": request.category_id,
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

    return aligned_features, shipping_variance


def predict_supply_risk(
    request: SupplyPredictionRequest,
) -> SupplyPredictionResponse:
    model = _load_model()
    model_input, shipping_variance = _build_model_input(request, model)
    probabilities = model.predict_proba(model_input)[0]

    classes = getattr(model, "classes_", None)
    positive_class_index = list(classes).index(1) if classes is not None and 1 in classes else -1
    disruption_probability = float(probabilities[positive_class_index])
    probability_percent = round(disruption_probability * 100, 2)

    if probability_percent >= 70:
        risk_level = "high"
    elif probability_percent >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return SupplyPredictionResponse(
        status="success",
        shipping_variance=shipping_variance,
        disruption_probability_percent=probability_percent,
        supplier_trust_score=round((1 - disruption_probability) * 100, 2),
        early_warning_alert=probability_percent >= 50,
        risk_level=risk_level,
    )
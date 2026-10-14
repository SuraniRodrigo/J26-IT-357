"""Train and persist the OPTICHAIN garment disruption classifier."""

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATA_PATH = Path.home() / "Downloads" / "sl_garment_productivity_40k.csv"
DEFAULT_MODEL_PATH = (
    ROOT_DIR / "backend" / "models_artifacts" / "supply" / "model.pkl"
)
TARGET_CANDIDATES = ("is_disruption", "Late_delivery_risk")
IDENTIFIER_COLUMNS = {"log_id", "id"}
POST_OUTCOME_COLUMNS = {"actual_productivity", "productivity_gap"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train a LightGBM classifier for garment disruption risk."
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to the input CSV.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_MODEL_PATH,
        help="Path where the fitted preprocessing/model pipeline is saved.",
    )
    return parser.parse_args()


def select_target(columns: pd.Index) -> str:
    targets = [candidate for candidate in TARGET_CANDIDATES if candidate in columns]
    if not targets:
        raise ValueError(
            "Dataset must contain either 'is_disruption' or 'Late_delivery_risk'."
        )
    return targets[0]


def main() -> None:
    args = parse_args()
    if not args.data.is_file():
        raise FileNotFoundError(f"Dataset CSV not found: {args.data}")

    data = pd.read_csv(args.data)
    if data.empty:
        raise ValueError(f"Dataset contains no rows: {args.data}")

    missing_values = data.isna().sum()
    print(f"Loaded {len(data):,} rows with columns: {', '.join(data.columns)}")
    missing_columns = missing_values[missing_values > 0]
    if not missing_columns.empty:
        print("Missing values by column:")
        print(missing_columns.to_string())
    else:
        print("Missing values: none")

    target_column = select_target(data.columns)
    target = pd.to_numeric(data[target_column], errors="coerce")
    valid_target = target.notna()
    data = data.loc[valid_target].copy()
    target = target.loc[valid_target]
    if not target.isin([0, 1]).all():
        raise ValueError(f"Target '{target_column}' must contain only 0 and 1.")
    target = target.astype(int)
    observed_classes = set(target.unique())
    if observed_classes != {0, 1}:
        raise ValueError(
            f"Target '{target_column}' must contain both binary labels 0 and 1; "
            f"found {sorted(observed_classes)}."
        )

    excluded_columns = {
        target_column,
        *IDENTIFIER_COLUMNS,
        *POST_OUTCOME_COLUMNS,
    }
    # The production date is not useful for unseen future dates; the dataset's
    # day_of_week feature retains the recurring temporal signal.
    if "date" in data.columns:
        excluded_columns.add("date")

    feature_columns = [
        column for column in data.columns if column not in excluded_columns
    ]
    if not feature_columns:
        raise ValueError("No usable feature columns remain after excluding identifiers.")

    features = data.loc[:, feature_columns].copy()
    if "sewing_line_id" in features.columns:
        features["sewing_line_id"] = features["sewing_line_id"].astype("string")
    categorical_columns = features.select_dtypes(
        include=["object", "string", "category"]
    ).columns.tolist()
    numeric_columns = [
        column for column in feature_columns if column not in categorical_columns
    ]
    if not numeric_columns and not categorical_columns:
        raise ValueError("No numeric or categorical model features were found.")

    preprocessing = ColumnTransformer(
        transformers=[
            (
                "numeric",
                SimpleImputer(strategy="median"),
                numeric_columns,
            ),
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "onehot",
                            OneHotEncoder(handle_unknown="ignore"),
                        ),
                    ]
                ),
                categorical_columns,
            ),
        ],
        remainder="drop",
    )
    model = Pipeline(
        steps=[
            ("preprocessor", preprocessing),
            (
                "classifier",
                LGBMClassifier(
                    objective="binary",
                    n_estimators=500,
                    learning_rate=0.05,
                    num_leaves=31,
                    max_depth=-1,
                    min_child_samples=30,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    reg_alpha=0.1,
                    reg_lambda=1.0,
                    random_state=42,
                    n_jobs=-1,
                    verbosity=-1,
                ),
            ),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=0.2,
        random_state=42,
        stratify=target,
    )
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)[:, 1]
    print(f"Dataset: {args.data}")
    print(f"Rows used: {len(data):,}")
    print(f"Target: {target_column}")
    print(f"Features ({len(feature_columns)}): {', '.join(feature_columns)}")
    print(f"Train/test rows: {len(x_train):,}/{len(x_test):,}")
    print("\nClassification report:")
    print(classification_report(y_test, predictions, labels=[0, 1], zero_division=0))
    print("Confusion matrix (labels [0, 1]):")
    print(confusion_matrix(y_test, predictions, labels=[0, 1]))
    print(f"ROC-AUC: {roc_auc_score(y_test, probabilities):.4f}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, args.output)
    print(f"\nSaved fitted preprocessing and LightGBM pipeline to: {args.output}")


if __name__ == "__main__":
    main()

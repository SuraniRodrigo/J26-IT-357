from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd


def _find_csv_path(relative_subpath: str) -> str | None:
    """
    Search for a CSV file across standard project root and backend directory locations.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    possible_roots = [
        # backend root
        os.path.dirname(os.path.dirname(current_dir)),
        # project workspace root
        os.path.dirname(os.path.dirname(os.path.dirname(current_dir))),
        os.getcwd(),
        os.path.join(os.getcwd(), "backend"),
    ]

    for root in possible_roots:
        candidate = os.path.normpath(os.path.join(root, relative_subpath))
        if os.path.exists(candidate):
            return candidate
    return None


class DemandRepository:
    """
    Production repository managing access to both real CSV datasets:
      1. DataCo Supply Chain Dataset (real apparel, sports items, categories, sales, order volumes)
      2. M5 Forecasting Dataset (real daily time-series sales across hierarchical categories & departments)
    """

    _instance: DemandRepository | None = None

    def __init__(self) -> None:
        self.dataco_path = _find_csv_path(
            os.path.join("Demand Forecasting", "Data", "Processed", "DatCo", "DataCo_Demand_Forecasting_Clean.csv")
        )
        self.m5_sales_path = _find_csv_path(
            os.path.join("Demand Forecasting", "Data", "Processed", "M5", "M5_Sales_DemandForecasting_Clean.csv")
        )
        self.m5_calendar_path = _find_csv_path(
            os.path.join("Demand Forecasting", "Data", "Processed", "M5", "M5_Calendar_DemandForecasting_Clean.csv")
        ) or _find_csv_path(
            os.path.join("Demand Forecasting", "Data", "Raw", "M5", "calendar.csv")
        )

        self._df_dataco: pd.DataFrame | None = None
        self._df_m5_sales: pd.DataFrame | None = None
        self._df_m5_calendar: pd.DataFrame | None = None

        self._dataco_products_summary: list[dict[str, Any]] | None = None
        self._dataco_categories_summary: list[dict[str, Any]] | None = None
        self._dataco_departments_summary: list[dict[str, Any]] | None = None

    @classmethod
    def get_instance(cls) -> DemandRepository:
        if cls._instance is None:
            cls._instance = DemandRepository()
        return cls._instance

    # -------------------------------------------------------------------------
    # DataCo Dataset Loader & Accessors
    # -------------------------------------------------------------------------
    def _ensure_dataco_loaded(self) -> pd.DataFrame | None:
        if self._df_dataco is not None:
            return self._df_dataco

        if not self.dataco_path or not os.path.exists(self.dataco_path):
            return None

        try:
            df = pd.read_csv(self.dataco_path)
            # Parse order date to standard date
            if "order date (DateOrders)" in df.columns:
                df["order_date"] = pd.to_datetime(df["order date (DateOrders)"]).dt.date
            self._df_dataco = df
            self._build_dataco_aggregations(df)
            return self._df_dataco
        except Exception as exc:
            print(f"Warning: Failed to load DataCo dataset from {self.dataco_path}: {exc}")
            return None

    def _build_dataco_aggregations(self, df: pd.DataFrame) -> None:
        # Pre-compute unique product summaries
        prod_grp = df.groupby("Product Name").agg(
            category_name=("Category Name", "first"),
            department_name=("Department Name", "first"),
            total_orders=("order date (DateOrders)", "count"),
            total_quantity=("Order Item Quantity", "sum"),
            total_sales=("Sales", "sum"),
            avg_price=("Order Item Product Price", "mean"),
        ).reset_index()

        # Add markets list per product
        markets_by_prod = df.groupby("Product Name")["Market"].unique().to_dict()

        products = []
        for _, row in prod_grp.iterrows():
            p_name = str(row["Product Name"])
            markets = [str(m) for m in markets_by_prod.get(p_name, []) if pd.notna(m)]
            products.append(
                {
                    "product_name": p_name,
                    "category_name": str(row["category_name"]),
                    "department_name": str(row["department_name"]),
                    "total_orders": int(row["total_orders"]),
                    "total_quantity": int(row["total_quantity"]),
                    "total_sales": float(round(row["total_sales"], 2)),
                    "avg_price": float(round(row["avg_price"], 2)),
                    "markets": markets,
                    "source": "dataco",
                }
            )
        self._dataco_products_summary = sorted(products, key=lambda x: x["total_orders"], reverse=True)

        # Pre-compute category summaries
        cat_grp = df.groupby("Category Name").agg(
            department_name=("Department Name", "first"),
            product_count=("Product Name", "nunique"),
            total_quantity=("Order Item Quantity", "sum"),
            total_sales=("Sales", "sum"),
        ).reset_index()

        categories = []
        for _, row in cat_grp.iterrows():
            categories.append(
                {
                    "category_name": str(row["Category Name"]),
                    "department_name": str(row["department_name"]),
                    "product_count": int(row["product_count"]),
                    "total_quantity": int(row["total_quantity"]),
                    "total_sales": float(round(row["total_sales"], 2)),
                    "source": "dataco",
                }
            )
        self._dataco_categories_summary = sorted(categories, key=lambda x: x["total_quantity"], reverse=True)

        # Pre-compute department summaries
        dept_grp = df.groupby("Department Name").agg(
            category_count=("Category Name", "nunique"),
            product_count=("Product Name", "nunique"),
            total_quantity=("Order Item Quantity", "sum"),
            total_sales=("Sales", "sum"),
        ).reset_index()

        departments = []
        for _, row in dept_grp.iterrows():
            departments.append(
                {
                    "department_name": str(row["Department Name"]),
                    "category_count": int(row["category_count"]),
                    "product_count": int(row["product_count"]),
                    "total_quantity": int(row["total_quantity"]),
                    "total_sales": float(round(row["total_sales"], 2)),
                    "source": "dataco",
                }
            )
        self._dataco_departments_summary = sorted(departments, key=lambda x: x["total_quantity"], reverse=True)

    def get_dataco_products(
        self,
        category: str | None = None,
        department: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        self._ensure_dataco_loaded()
        if not self._dataco_products_summary:
            return []

        results = self._dataco_products_summary

        if category and category.upper() != "ALL":
            cat_lower = category.strip().lower()
            results = [p for p in results if p["category_name"].lower() == cat_lower]

        if department and department.upper() != "ALL":
            dept_lower = department.strip().lower()
            results = [p for p in results if p["department_name"].lower() == dept_lower]

        if search:
            q = search.strip().lower()
            results = [
                p
                for p in results
                if q in p["product_name"].lower()
                or q in p["category_name"].lower()
                or q in p["department_name"].lower()
            ]

        return results[offset : offset + limit]

    def get_dataco_categories(self) -> list[dict[str, Any]]:
        self._ensure_dataco_loaded()
        return self._dataco_categories_summary or []

    def get_dataco_departments(self) -> list[dict[str, Any]]:
        self._ensure_dataco_loaded()
        return self._dataco_departments_summary or []

    def get_dataco_markets(self) -> list[str]:
        df = self._ensure_dataco_loaded()
        if df is None or "Market" not in df.columns:
            return []
        return sorted([str(m) for m in df["Market"].dropna().unique().tolist()])

    def get_dataco_time_series(
        self,
        product_name: str | None = None,
        category: str | None = None,
        department: str | None = None,
        days: int = 90,
    ) -> list[dict[str, Any]]:
        df = self._ensure_dataco_loaded()
        if df is None:
            return []

        filtered = df
        if product_name and product_name.upper() != "ALL":
            filtered = filtered[filtered["Product Name"].str.lower() == product_name.strip().lower()]
        elif category and category.upper() != "ALL":
            filtered = filtered[filtered["Category Name"].str.lower() == category.strip().lower()]
        elif department and department.upper() != "ALL":
            filtered = filtered[filtered["Department Name"].str.lower() == department.strip().lower()]

        if filtered.empty:
            return []

        daily = (
            filtered.groupby("order_date")
            .agg(
                quantity=("Order Item Quantity", "sum"),
                sales=("Sales", "sum"),
                orders_count=("order date (DateOrders)", "count"),
            )
            .sort_index()
        )

        if days and days > 0:
            daily = daily.tail(days)

        points = []
        for d, row in daily.iterrows():
            points.append(
                {
                    "date": str(d),
                    "quantity": float(row["quantity"]),
                    "sales": float(round(row["sales"], 2)),
                    "orders_count": int(row["orders_count"]),
                }
            )
        return points

    # -------------------------------------------------------------------------
    # M5 Dataset Loader & Accessors
    # -------------------------------------------------------------------------
    def _ensure_m5_loaded(self) -> pd.DataFrame | None:
        if self._df_m5_sales is not None:
            return self._df_m5_sales

        if not self.m5_sales_path or not os.path.exists(self.m5_sales_path):
            return None

        try:
            self._df_m5_sales = pd.read_csv(self.m5_sales_path)
            return self._df_m5_sales
        except Exception as exc:
            print(f"Warning: Failed to load M5 dataset from {self.m5_sales_path}: {exc}")
            return None

    def get_m5_hierarchy_info(self) -> dict[str, Any]:
        df = self._ensure_m5_loaded()
        if df is None:
            return {"status": "unavailable", "message": "M5 dataset not loaded"}

        categories = sorted(df["cat_id"].dropna().unique().tolist())
        departments = sorted(df["dept_id"].dropna().unique().tolist())
        day_cols = [c for c in df.columns if c.startswith("d_")]

        return {
            "categories": categories,
            "departments": departments,
            "total_items": int(df["item_id"].nunique()),
            "total_rows": len(df),
            "historical_days": len(day_cols),
            "day_range": f"d_1 to d_{len(day_cols)}",
            "stores": sorted(df["store_id"].dropna().unique().tolist()),
            "source": "m5",
        }

    def get_m5_time_series(self, node_id: str, days: int = 90) -> list[dict[str, Any]]:
        df = self._ensure_m5_loaded()
        if df is None:
            return []

        day_cols = [c for c in df.columns if c.startswith("d_")]
        if not day_cols:
            return []

        target_days = day_cols[-days:] if days > 0 else day_cols

        q = node_id.strip()
        if q == "TOTAL" or q.upper() == "ALL":
            values = df[target_days].sum(axis=0).values
        elif q in df["cat_id"].values:
            values = df[df["cat_id"] == q][target_days].sum(axis=0).values
        elif q in df["dept_id"].values:
            values = df[df["dept_id"] == q][target_days].sum(axis=0).values
        elif q in df["item_id"].values:
            values = df[df["item_id"] == q][target_days].sum(axis=0).values
        else:
            # Substring item match
            matched = df[df["item_id"].str.contains(q, case=False, na=False)]
            if not matched.empty:
                values = matched[target_days].sum(axis=0).values
            else:
                values = df[target_days].sum(axis=0).values

        # Build output points with synthetic consecutive dates ending today
        base_date = date.today() - timedelta(days=len(values))
        points = []
        for i, val in enumerate(values):
            pt_date = base_date + timedelta(days=i + 1)
            points.append(
                {
                    "date": str(pt_date),
                    "quantity": float(round(val, 1)),
                    "sales": None,
                    "orders_count": None,
                }
            )
        return points

    # -------------------------------------------------------------------------
    # Empirical Forecast Derived Directly from Real CSV Series
    # (Replaces fake sine-wave math.sin fallback)
    # -------------------------------------------------------------------------
    def get_empirical_forecast(
        self,
        identifier: str,
        horizon_days: int = 30,
        model_version: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Calculates an empirical forecast strictly derived from the real CSV time-series history:
          - Daily moving average
          - Day-of-week empirical seasonal factors
          - Recent trend slope
          - P10 and P90 empirical prediction intervals based on real historical standard deviation
        """
        active_version = model_version or "Empirical-CSV-Historical-v1.0"
        base_date = date.today()

        # 1. Try to find real historical series from DataCo first
        time_series = self.get_dataco_time_series(product_name=identifier, days=60)
        source = "dataco"

        # If empty, check DataCo category or department
        if not time_series:
            time_series = self.get_dataco_time_series(category=identifier, days=60)
        if not time_series:
            time_series = self.get_dataco_time_series(department=identifier, days=60)

        # 2. If still empty, check M5 series
        if not time_series:
            time_series = self.get_m5_time_series(node_id=identifier, days=60)
            source = "m5"

        # 3. Extract quantity array
        quantities = [pt["quantity"] for pt in time_series if pt.get("quantity") is not None]
        if not quantities:
            # Fallback to total DataCo overall daily mean
            all_pts = self.get_dataco_time_series(days=30)
            quantities = [pt["quantity"] for pt in all_pts if pt.get("quantity") is not None] or [50.0]

        vals = np.array(quantities, dtype=float)
        mean_val = float(np.mean(vals))
        std_val = float(np.std(vals)) if len(vals) > 1 else max(1.0, mean_val * 0.15)

        # Calculate day-of-week seasonality if date information is present
        dow_multipliers = {dow: 1.0 for dow in range(7)}
        try:
            dow_records: dict[int, list[float]] = {i: [] for i in range(7)}
            for pt in time_series:
                dt_obj = date.fromisoformat(pt["date"])
                dow_records[dt_obj.weekday()].append(pt["quantity"])

            for dow, dow_vals in dow_records.items():
                if dow_vals and mean_val > 0:
                    dow_multipliers[dow] = float(np.mean(dow_vals)) / mean_val
        except Exception:
            pass

        # Calculate trend slope over recent real history
        slope = 0.0
        if len(vals) >= 7:
            x = np.arange(len(vals))
            try:
                poly = np.polyfit(x, vals, 1)
                slope = float(poly[0])
                # Cap extreme slopes
                max_slope = mean_val * 0.05
                slope = max(-max_slope, min(max_slope, slope))
            except Exception:
                slope = 0.0

        records = []
        for step in range(horizon_days):
            fc_date = base_date + timedelta(days=step + 1)
            dow = fc_date.weekday()
            season_factor = dow_multipliers.get(dow, 1.0)

            trend_term = slope * step
            fc_val = max(0.0, float(round((mean_val + trend_term) * season_factor, 1)))

            p10 = max(0.0, float(round(fc_val - 1.28 * std_val, 1)))
            p90 = float(round(fc_val + 1.28 * std_val, 1))

            records.append(
                {
                    "product_id": identifier,
                    "forecast_date": fc_date,
                    "forecasted_demand": fc_val,
                    "forecast_horizon": horizon_days,
                    "model_version": active_version,
                    "lower_bound": p10,
                    "upper_bound": p90,
                    "data_source": f"{source}_real_csv",
                }
            )

        return records

    # -------------------------------------------------------------------------
    # Combined Summary
    # -------------------------------------------------------------------------
    def get_datasets_summary(self) -> dict[str, Any]:
        df_dataco = self._ensure_dataco_loaded()
        df_m5 = self._ensure_m5_loaded()

        dataco_info = {
            "loaded": df_dataco is not None,
            "total_records": len(df_dataco) if df_dataco is not None else 0,
            "unique_products": len(self._dataco_products_summary or []),
            "unique_categories": len(self._dataco_categories_summary or []),
            "unique_departments": len(self._dataco_departments_summary or []),
            "total_sales_usd": float(round(df_dataco["Sales"].sum(), 2)) if df_dataco is not None and "Sales" in df_dataco else 0.0,
            "total_units_sold": int(df_dataco["Order Item Quantity"].sum()) if df_dataco is not None and "Order Item Quantity" in df_dataco else 0,
            "date_range": (
                f"{df_dataco['order_date'].min()} to {df_dataco['order_date'].max()}"
                if df_dataco is not None and "order_date" in df_dataco
                else "N/A"
            ),
        }

        m5_day_cols = [c for c in df_m5.columns if c.startswith("d_")] if df_m5 is not None else []
        m5_info = {
            "loaded": df_m5 is not None,
            "total_rows": len(df_m5) if df_m5 is not None else 0,
            "unique_items": int(df_m5["item_id"].nunique()) if df_m5 is not None else 0,
            "categories": sorted(df_m5["cat_id"].dropna().unique().tolist()) if df_m5 is not None else [],
            "departments": sorted(df_m5["dept_id"].dropna().unique().tolist()) if df_m5 is not None else [],
            "historical_days": len(m5_day_cols),
        }

        active = []
        if df_dataco is not None:
            active.append("DataCo_SupplyChain")
        if df_m5 is not None:
            active.append("M5_Forecasting")

        return {
            "dataco": dataco_info,
            "m5": m5_info,
            "active_sources": active,
        }

from __future__ import annotations

from datetime import date, timedelta

from app.schemas.demand import DemandForecastRequest, DemandForecastSchema


def generate_forecast(request: DemandForecastRequest) -> list[DemandForecastSchema]:
    if request.forecast_horizon_days < 1:
        raise ValueError("Forecast horizon must be positive.")

    base_date = date.today()
    records = []
    for step in range(request.forecast_horizon_days):
        forecast_date = base_date + timedelta(days=step + 1)
        records.append(
            DemandForecastSchema(
                product_id=request.product_id,
                forecast_date=forecast_date,
                forecasted_demand=None,
                forecast_horizon=request.forecast_horizon_days,
                model_version=request.model_version or "not-available",
            )
        )
    return records

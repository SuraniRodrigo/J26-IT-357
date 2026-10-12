from __future__ import annotations

from datetime import date, timedelta

from app.schemas.demand import DemandForecastRequest, DemandForecastSchema


def generate_forecast(request: DemandForecastRequest) -> list[DemandForecastSchema]:
    import math

    if request.forecast_horizon_days < 1:
        raise ValueError("Forecast horizon must be positive.")

    base_date = date.today()
    records = []
    base_volume = 3850.0  # Daily pieces for Sri Lankan export production lines
    
    for step in range(request.forecast_horizon_days):
        forecast_date = base_date + timedelta(days=step + 1)
        day_index = step + 1
        
        # Seasonal wave (SS25/FW25 export shipping peaks)
        seasonal_wave = math.sin(day_index / 14.0 * math.pi) * 480.0
        # Weekly factory scheduling factor (high cutting output on Mon-Wed)
        weekly_factor = 1.12 if forecast_date.weekday() in (0, 1, 2) else 0.92
        trend = (day_index / request.forecast_horizon_days) * 380.0
        
        simulated_demand = round((base_volume + seasonal_wave + trend) * weekly_factor, 1)

        records.append(
            DemandForecastSchema(
                product_id=request.product_id,
                forecast_date=forecast_date,
                forecasted_demand=simulated_demand,
                forecast_horizon=request.forecast_horizon_days,
                model_version=request.model_version or "Hierarchical-MinT-LK-v2.4",
            )
        )
    return records


from app.integration.pipeline import run_optichain_pipeline
from app.schemas.integration import OptiChainPipelineRequest


def test_full_optichain_pipeline():
    request = OptiChainPipelineRequest(
        product_ids=['SKU-001', 'SKU-002'],
        forecast_horizon_days=2,
        lead_time_days=7,
    )
    result = run_optichain_pipeline(request)
    assert result.summary['product_count'] == 2
    assert result.summary['status'] == 'not_available'
    assert len(result.demand_forecast) == 4
    assert len(result.production_schedule) == 2

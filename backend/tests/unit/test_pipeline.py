from app.integration.pipeline import run_optichain_pipeline
from app.schemas.integration import OptiChainPipelineRequest


def test_optichain_pipeline_returns_structured_unavailable_response():
    request = OptiChainPipelineRequest(product_ids=['SKU-001'], forecast_horizon_days=3)
    result = run_optichain_pipeline(request)
    assert result.summary['status'] == 'not_available'
    assert len(result.demand_forecast) == 3
    assert len(result.inventory_policy) == 1

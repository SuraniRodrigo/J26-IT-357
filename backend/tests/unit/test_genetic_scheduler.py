from app.schemas.production import GeneticProductionScheduleRequest
from app.services.genetic_scheduler import GeneticProductionScheduler


def make_order(order_id: str, **overrides: object) -> dict:
    order = {
        "order_id": order_id,
        "product_id": f"SKU-{order_id}",
        "product_family": "shirt",
        "cutting_minutes": 8,
        "sewing_minutes": 15,
        "finishing_minutes": 5,
        "due_time_minutes": 40,
    }
    order.update(overrides)
    return order


def make_request(**overrides: object) -> GeneticProductionScheduleRequest:
    request = {
        "orders": [make_order("A"), make_order("B"), make_order("C")],
        "sewing_lines": ["Line A", "Line B"],
        "population_size": 8,
        "generations": 8,
        "max_time_seconds": 2,
        "seed": 17,
    }
    request.update(overrides)
    return GeneticProductionScheduleRequest(**request)


def test_ga_returns_precedence_safe_gantt_and_spt_benchmark():
    result = GeneticProductionScheduler().solve_and_optimize(make_request())

    assert result.algorithm == "genetic_algorithm"
    assert result.generations_completed == 8
    assert len(result.gantt_schedule) == 9
    assert result.runtime_seconds >= result.spt_benchmark.runtime_seconds
    assert result.spt_benchmark.makespan_minutes > 0
    assert result.fitness_improvement_vs_spt_percent >= 0
    assert result.fitness <= result.spt_benchmark.fitness
    for order_id in ("A", "B", "C"):
        operations = {
            operation.stage: operation
            for operation in result.gantt_schedule
            if operation.order_id == order_id
        }
        assert operations["cutting"].end_minute <= operations["sewing"].start_minute
        assert operations["sewing"].end_minute <= operations["finishing"].start_minute


def test_telemetry_threshold_triggers_dynamic_crossover_and_mutation():
    result = GeneticProductionScheduler().solve_and_optimize(
        make_request(
            crossover_probability=0.5,
            mutation_probability=0.1,
            telemetry_bottleneck_risk_probabilities={"Line A": 0.46},
        )
    )

    assert result.dynamic_reoptimization_triggered is True
    assert "telemetry:Line A" in result.dynamic_trigger_sources
    assert result.effective_crossover_probability == 0.95
    assert result.effective_mutation_probability == 0.45


def test_factory_worker_capacity_limits_parallel_sewing_across_lines():
    request = make_request(
        orders=[
            make_order("A", sewing_workers=1),
            make_order("B", sewing_workers=1),
        ],
        total_sewing_workers=1,
    )

    result = GeneticProductionScheduler().solve_and_optimize(request)
    sewing = sorted(
        (operation for operation in result.gantt_schedule if operation.stage == "sewing"),
        key=lambda operation: operation.start_minute,
    )

    assert len(sewing) == 2
    assert sewing[0].end_minute <= sewing[1].start_minute


def test_disrupted_sewing_line_is_reassigned_and_costs_include_risk():
    result = GeneticProductionScheduler().solve_and_optimize(
        make_request(
            orders=[
                make_order(
                    "A",
                    machine_disruption_probability=0.2,
                    machine_delay_minutes=8,
                ),
                make_order("B"),
                make_order("C"),
            ],
            sewing_line_disruption_probabilities={"Line A": 0.46},
            disruption_risk_weight=3,
        )
    )

    assert result.dynamic_reoptimization_triggered is True
    assert set(result.sewing_line_assignments.values()) == {"Line B"}
    assert result.disruption_risk_minutes > 0
    assert result.fitness >= result.makespan_minutes


def test_ga_is_repeatable_for_same_seed_and_request():
    request = make_request()
    scheduler = GeneticProductionScheduler()

    first = scheduler.solve_and_optimize(request)
    second = scheduler.solve_and_optimize(request)

    assert first.gantt_schedule == second.gantt_schedule
    assert first.fitness == second.fitness
    assert first.sewing_line_assignments == second.sewing_line_assignments


def test_genetic_endpoint_returns_schedule_and_spt_comparison():
    from fastapi.testclient import TestClient

    from app.main import app

    response = TestClient(app).post(
        "/api/production/schedule/genetic",
        json=make_request().model_dump(mode="json"),
    )

    assert response.status_code == 200
    result = response.json()
    assert result["algorithm"] == "genetic_algorithm"
    assert "spt_benchmark" in result
    assert len(result["gantt_schedule"]) == 9

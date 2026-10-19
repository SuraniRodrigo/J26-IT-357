from app.schemas.production import ProductionScheduleRequest
from app.services.jssp_scheduler import SelfHealingJSSPScheduler


def make_order(order_id: str, **overrides: object) -> dict:
    order = {
        "order_id": order_id,
        "product_id": f"SKU-{order_id}",
        "product_family": "shirt",
        "cutting_minutes": 10,
        "sewing_minutes": 20,
        "finishing_minutes": 5,
        "due_time_minutes": 100,
    }
    order.update(overrides)
    return order


def test_scheduler_respects_stage_precedence_and_shared_machine_capacity():
    request = ProductionScheduleRequest(
        orders=[make_order("A"), make_order("B")],
        sewing_lines=["Line A", "Line B"],
        cutting_machines=1,
        finishing_machines=1,
    )

    result = SelfHealingJSSPScheduler().solve_and_optimize(request)

    assert result.makespan_minutes > 0
    assert len(result.gantt_schedule) == 6
    for order_id in ("A", "B"):
        operations = {
            operation.stage: operation
            for operation in result.gantt_schedule
            if operation.order_id == order_id
        }
        assert operations["cutting"].end_minute <= operations["sewing"].start_minute
        assert operations["sewing"].end_minute <= operations["finishing"].start_minute
    cutting = sorted(
        (operation for operation in result.gantt_schedule if operation.stage == "cutting"),
        key=lambda operation: operation.start_minute,
    )
    assert cutting[0].end_minute <= cutting[1].start_minute


def test_machine_pool_and_factory_sewing_worker_limits_are_reflected_in_gantt():
    request = ProductionScheduleRequest(
        orders=[
            make_order("A", sewing_workers=1, due_time_minutes=0),
            make_order("B", sewing_workers=1, due_time_minutes=0),
        ],
        sewing_lines=["Line A", "Line B"],
        cutting_machines=2,
        finishing_machines=2,
        total_sewing_workers=1,
    )

    result = SelfHealingJSSPScheduler().solve_and_optimize(request)

    cutting = [operation for operation in result.gantt_schedule if operation.stage == "cutting"]
    assert len({operation.resource for operation in cutting}) == 2
    sewing = sorted(
        (operation for operation in result.gantt_schedule if operation.stage == "sewing"),
        key=lambda operation: operation.start_minute,
    )
    assert sewing[0].end_minute <= sewing[1].start_minute
    assert result.total_tardiness_minutes == sum(
        max(
            0,
            next(
                operation.end_minute
                for operation in result.gantt_schedule
                if operation.order_id == order.order_id
                and operation.stage == "finishing"
            )
            - order.due_time_minutes,
        )
        for order in request.orders
    )


def test_threshold_closes_disrupted_sewing_line_and_triggers_healing():
    request = ProductionScheduleRequest(
        orders=[make_order("A")],
        sewing_lines=["Line A", "Line B"],
        sewing_line_disruption_probabilities={"Line A": 0.46},
    )

    result = SelfHealingJSSPScheduler().solve_and_optimize(request)

    assert result.healing_triggered is True
    assert result.sewing_line_assignments == {"A": "Line B"}


def test_order_disruption_adds_expected_release_delay():
    request = ProductionScheduleRequest(
        orders=[
            make_order(
                "A",
                order_disruption_probability=0.46,
                order_delay_minutes=5,
            )
        ],
        sewing_lines=["Line A"],
    )

    result = SelfHealingJSSPScheduler().solve_and_optimize(request)
    cutting = next(
        operation
        for operation in result.gantt_schedule
        if operation.stage == "cutting"
    )

    assert result.healing_triggered is True
    assert cutting.start_minute >= 3


def test_scheduler_rejects_orders_without_available_eligible_lines():
    request = ProductionScheduleRequest(
        orders=[make_order("A", eligible_sewing_lines=["Line A"])],
        sewing_lines=["Line A", "Line B"],
        sewing_line_disruption_probabilities={"Line A": 0.46},
    )

    try:
        SelfHealingJSSPScheduler().solve_and_optimize(request)
    except ValueError as exc:
        assert "no eligible sewing lines" in str(exc)
    else:
        raise AssertionError("Expected an order with no available line to be rejected")


def test_changeover_cost_only_applies_between_consecutive_sewing_jobs():
    request = ProductionScheduleRequest(
        orders=[
            make_order("A", product_family="cotton"),
            make_order("B", product_family="denim"),
            make_order("C", product_family="linen"),
        ],
        sewing_lines=["Line A"],
        changeover_times={
            "cotton": {"denim": 4, "linen": 8},
            "denim": {"cotton": 6, "linen": 3},
            "linen": {"cotton": 2, "denim": 5},
        },
    )

    result = SelfHealingJSSPScheduler().solve_and_optimize(request)
    sewing = sorted(
        (operation for operation in result.gantt_schedule if operation.stage == "sewing"),
        key=lambda operation: operation.start_minute,
    )
    families = {
        order.order_id: order.product_family for order in request.orders
    }
    expected_changeover = sum(
        request.changeover_times[families[first.order_id]][families[second.order_id]]
        for first, second in zip(sewing, sewing[1:])
    )

    assert result.changeover_cost_minutes == expected_changeover
    for first, second in zip(sewing, sewing[1:]):
        setup = request.changeover_times[families[first.order_id]][families[second.order_id]]
        assert second.start_minute >= first.end_minute + setup

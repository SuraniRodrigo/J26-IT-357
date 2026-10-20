from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_dashboard_returns_production_overview_data():
    response = client.get("/api/production-ui/dashboard")

    assert response.status_code == 200
    dashboard = response.json()
    assert dashboard["kpis"]["output_pieces"] == 6240
    assert dashboard["kpis"]["target_pieces"] == 8000
    assert [line["name"] for line in dashboard["lines"]] == [
        "Line 01",
        "Line 02",
        "Line 03",
        "Line 04",
    ]
    assert len(dashboard["output_trend"]) == 11
    assert dashboard["recent_events"]


def test_disruption_can_be_created_listed_and_resolved():
    created = client.post(
        "/api/production-ui/disruptions",
        json={
            "title": "Needle breakage",
            "line_id": "Line 05",
            "disruption_type": "Machine failure",
            "description": "Sewing machine stopped after a needle broke.",
            "risk_score": 90,
            "severity_minutes": 35,
            "affected_order": "ORD-2099",
            "factors": ["Needle sensor alarm"],
        },
    )

    assert created.status_code == 201
    disruption = created.json()
    assert disruption["level"] == "High"
    assert disruption["status"] == "active"
    assert disruption["line"] == "Line 05"
    assert any(
        item["id"] == disruption["id"]
        for item in client.get("/api/production-ui/disruptions").json()
    )

    resolved = client.post(
        f"/api/production-ui/disruptions/{disruption['id']}/resolve"
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["level"] == "Resolved"
    assert client.post(
        f"/api/production-ui/disruptions/{disruption['id']}/resolve"
    ).status_code == 409


def test_simulation_is_saved_without_changing_live_schedule():
    before = client.get("/api/production-ui/schedule").json()
    response = client.post(
        "/api/production-ui/simulations",
        json={
            "scenario_name": "Morning machine failure",
            "disruption_type": "Machine breakdown",
            "production_line": "Line 02",
            "affected_order": "ORD-2048",
            "start_time": "11:00",
            "duration_minutes": 90,
            "severity": "High",
            "unavailable_machines": 2,
            "notes": "Simulation only.",
        },
    )

    assert response.status_code == 201
    simulation = response.json()
    assert simulation["sandbox_only"] is True
    assert simulation["projected_output_percent"] == 66
    assert simulation["estimated_delay_recovered_minutes"] == 27
    assert client.get("/api/production-ui/schedule").json() == before
    assert any(
        item["id"] == simulation["id"]
        for item in client.get("/api/production-ui/simulations").json()
    )


def test_recovery_plan_apply_and_rollback_change_schedule():
    initial = client.get("/api/production-ui/schedule").json()
    plan_response = client.post(
        "/api/production-ui/recovery-plans",
        json={"objective": "balanced"},
    )

    assert plan_response.status_code == 201
    plan = plan_response.json()
    assert plan["source_line"] == "Line 02"
    assert plan["destination_line"] == "Line 05"
    assert plan["status"] == "proposed"

    applied = client.post(
        f"/api/production-ui/recovery-plans/{plan['plan_id']}/apply"
    )
    assert applied.status_code == 200
    assert applied.json()["status"] == "applied"
    schedule_after_apply = client.get("/api/production-ui/schedule").json()
    assert schedule_after_apply["version"] == initial["version"] + 1
    assert schedule_after_apply["status"] == "recovery_applied"
    moved_order = next(
        order
        for line in schedule_after_apply["schedule"]
        if line["line"] == "Line 05"
        for order in line["orders"]
        if order["id"] == plan["order_id"]
    )
    assert moved_order["type"] == "moved"
    original_slot = next(
        order
        for line in schedule_after_apply["schedule"]
        if line["line"] == "Line 02"
        for order in line["orders"]
        if order["id"] == plan["order_id"]
    )
    assert original_slot["type"] == "original"
    assert client.post(
        f"/api/production-ui/recovery-plans/{plan['plan_id']}/apply"
    ).status_code == 409

    rolled_back = client.post("/api/production-ui/schedule/rollback")
    assert rolled_back.status_code == 200
    schedule_after_rollback = rolled_back.json()
    assert schedule_after_rollback["version"] == initial["version"] + 2
    assert schedule_after_rollback["status"] == "rolled_back"
    assert schedule_after_rollback["schedule"] == initial["schedule"]
    assert client.get(
        f"/api/production-ui/recovery-plans/{plan['plan_id']}"
    ).json()["status"] == "rolled_back"
    assert client.post("/api/production-ui/schedule/rollback").status_code == 409


def test_recovery_plan_not_found_returns_404():
    response = client.post(
        "/api/production-ui/recovery-plans/unknown-plan/apply"
    )

    assert response.status_code == 404

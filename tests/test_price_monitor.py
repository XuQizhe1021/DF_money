from __future__ import annotations

from pathlib import Path

from backend.app import create_app
from backend.config import Settings


def _settings(tmp_path: Path) -> Settings:
    return Settings(
        app_name="test",
        environment="test",
        debug=False,
        testing=True,
        host="127.0.0.1",
        port=5000,
        db_path=tmp_path / "alerts.db",
        api_base_url="https://example.com",
        api_ammo_endpoint="/ammo",
        request_timeout_seconds=2,
        request_retries=1,
        request_retry_backoff_seconds=0.1,
        fetch_interval_minutes=60,
        scheduler_enabled=False,
        mock_on_failure=True,
        log_level="INFO",
        log_file=tmp_path / "alerts.log",
    )


def test_price_monitor_trigger_and_cooldown(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()
    client.post("/api/tasks/fetch-now")
    latest = client.get("/api/ammo/latest").get_json()["data"]["items"]
    ammo = latest[0]
    current_price = float(ammo["price"])
    create = client.post(
        "/api/holdings",
        json={
            "ammo_id": ammo["id"],
            "purchase_price": current_price * 0.7,
            "threshold_pct": 0.1,
        },
    )
    assert create.status_code == 201

    first_eval = client.post("/api/alerts/evaluate")
    assert first_eval.status_code == 200
    assert first_eval.get_json()["data"]["triggered"] >= 1

    second_eval = client.post("/api/alerts/evaluate")
    assert second_eval.status_code == 200
    assert second_eval.get_json()["data"]["triggered"] == 0

    events_resp = client.get("/api/alerts/events?unread_only=true")
    events_body = events_resp.get_json()["data"]
    assert events_body["count"] >= 1
    event_id = events_body["items"][0]["id"]

    mark_read = client.post("/api/alerts/read", json={"event_ids": [event_id]})
    assert mark_read.status_code == 200
    assert mark_read.get_json()["data"]["updated"] >= 1

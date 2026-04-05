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
        db_path=tmp_path / "test.db",
        api_base_url="https://example.com",
        api_ammo_endpoint="/ammo",
        request_timeout_seconds=2,
        request_retries=1,
        request_retry_backoff_seconds=0.1,
        fetch_interval_minutes=60,
        scheduler_enabled=False,
        mock_on_failure=True,
        log_level="INFO",
        log_file=tmp_path / "test.log",
    )


def test_health(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()
    response = client.get("/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["code"] == "OK"
    assert body["data"]["status"] == "ok"


def test_fetch_latest_and_history(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()
    fetch_response = client.post("/api/tasks/fetch-now")
    assert fetch_response.status_code == 200
    latest_response = client.get("/api/ammo/latest")
    latest_body = latest_response.get_json()
    assert latest_response.status_code == 200
    assert latest_body["data"]["count"] >= 1
    ammo_id = latest_body["data"]["items"][0]["id"]
    history_response = client.get(f"/api/ammo/{ammo_id}/history?days=7")
    history_body = history_response.get_json()
    assert history_response.status_code == 200
    assert history_body["data"]["ammo_id"] == ammo_id
    assert len(history_body["data"]["items"]) >= 1

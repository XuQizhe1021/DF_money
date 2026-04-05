from __future__ import annotations

from pathlib import Path

from backend.app import create_app
from backend.config import Settings
from backend.data_fetcher import FetcherError


def _settings(tmp_path: Path, mock_on_failure: bool = True) -> Settings:
    return Settings(
        app_name="test",
        environment="test",
        debug=False,
        testing=True,
        host="127.0.0.1",
        port=5000,
        db_path=tmp_path / "m4.db",
        api_base_url="https://example.com",
        api_ammo_endpoint="/ammo",
        request_timeout_seconds=2,
        request_retries=1,
        request_retry_backoff_seconds=0.1,
        fetch_interval_minutes=60,
        scheduler_enabled=False,
        mock_on_failure=mock_on_failure,
        log_level="INFO",
        log_file=tmp_path / "m4.log",
    )


def test_full_chain_integration(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()

    fetch_resp = client.post("/api/tasks/fetch-now")
    assert fetch_resp.status_code == 200
    assert fetch_resp.get_json()["code"] == "OK"

    latest_resp = client.get("/api/ammo/latest")
    assert latest_resp.status_code == 200
    latest_items = latest_resp.get_json()["data"]["items"]
    assert len(latest_items) >= 1
    ammo_id = latest_items[0]["id"]
    price_now = float(latest_items[0]["price"])

    history_resp = client.get(f"/api/ammo/{ammo_id}/history?days=7")
    assert history_resp.status_code == 200

    ranking_resp = client.get("/api/ammo/change-ranking?days=7&limit=3")
    assert ranking_resp.status_code == 200
    ranking_body = ranking_resp.get_json()["data"]
    assert "gainers" in ranking_body
    assert "losers" in ranking_body

    create_holding_resp = client.post(
        "/api/holdings",
        json={
            "ammo_id": ammo_id,
            "purchase_price": max(1.0, price_now * 0.7),
            "threshold_pct": 0.1,
        },
    )
    assert create_holding_resp.status_code == 201

    holding_list_resp = client.get("/api/holdings?limit=5&offset=0")
    assert holding_list_resp.status_code == 200
    assert holding_list_resp.get_json()["data"]["count"] >= 1

    eval_resp = client.post("/api/alerts/evaluate")
    assert eval_resp.status_code == 200

    events_resp = client.get("/api/alerts/events?unread_only=true&limit=10&offset=0")
    assert events_resp.status_code == 200
    events = events_resp.get_json()["data"]["items"]
    if events:
        mark_read_resp = client.post("/api/alerts/read", json={"event_ids": [events[0]["id"]]})
        assert mark_read_resp.status_code == 200

    analysis_resp = client.post(
        "/api/analysis/run",
        json={"ammo_id": ammo_id, "days": 7, "force_refresh": True},
    )
    assert analysis_resp.status_code == 200
    analysis_data = analysis_resp.get_json()["data"]
    assert analysis_data["source"] in {"ai", "rule_based"}


def test_exception_and_boundary_paths(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()

    invalid_days_resp = client.get("/api/ammo/unknown/history?days=0")
    assert invalid_days_resp.status_code == 422
    assert invalid_days_resp.get_json()["code"] == "INVALID_PARAM"

    empty_analysis_resp = client.post(
        "/api/analysis/run",
        json={"ammo_id": "unknown", "days": 7, "force_refresh": True},
    )
    assert empty_analysis_resp.status_code == 404
    assert empty_analysis_resp.get_json()["code"] == "EMPTY_DATA"

    invalid_ranking_limit_resp = client.get("/api/ammo/change-ranking?days=7&limit=0")
    assert invalid_ranking_limit_resp.status_code == 422
    assert invalid_ranking_limit_resp.get_json()["code"] == "INVALID_PARAM"


def test_fetch_fail_when_remote_unavailable_and_mock_disabled(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path, mock_on_failure=False))
    client = app.test_client()

    fetcher = app.extensions["ingestion_service"].fetcher

    def _always_fail() -> None:
        raise FetcherError("network down")

    fetcher._fetch_remote = _always_fail  # type: ignore[attr-defined]

    response = client.post("/api/tasks/fetch-now")
    assert response.status_code == 500
    assert response.get_json()["code"] == "FETCH_ERROR"

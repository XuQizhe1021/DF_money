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
        db_path=tmp_path / "holdings.db",
        api_base_url="https://example.com",
        api_ammo_endpoint="/ammo",
        request_timeout_seconds=2,
        request_retries=1,
        request_retry_backoff_seconds=0.1,
        fetch_interval_minutes=60,
        scheduler_enabled=False,
        mock_on_failure=True,
        log_level="INFO",
        log_file=tmp_path / "holdings.log",
    )


def test_holdings_crud_and_profit(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()
    fetch = client.post("/api/tasks/fetch-now")
    assert fetch.status_code == 200
    latest = client.get("/api/ammo/latest").get_json()["data"]["items"]
    ammo_id = latest[0]["id"]
    price_now = float(latest[0]["price"])
    create_payload = {
        "ammo_id": ammo_id,
        "purchase_price": price_now - 10,
        "threshold_pct": 0.2,
    }
    create_resp = client.post("/api/holdings", json=create_payload)
    assert create_resp.status_code == 201
    created = create_resp.get_json()["data"]
    assert created["pnl_value"] == 10
    holding_id = created["id"]

    list_resp = client.get("/api/holdings")
    assert list_resp.status_code == 200
    assert list_resp.get_json()["data"]["count"] >= 1

    patch_resp = client.patch(f"/api/holdings/{holding_id}", json={"purchase_price": price_now - 20})
    assert patch_resp.status_code == 200
    assert patch_resp.get_json()["data"]["pnl_value"] == 20

    sell_resp = client.post(f"/api/holdings/{holding_id}/sell")
    assert sell_resp.status_code == 200
    assert sell_resp.get_json()["data"]["status"] == "sold"

    delete_resp = client.delete(f"/api/holdings/{holding_id}")
    assert delete_resp.status_code == 200


def test_holdings_invalid_param(tmp_path: Path) -> None:
    app = create_app(_settings(tmp_path))
    client = app.test_client()
    response = client.post("/api/holdings", json={"ammo_id": "", "purchase_price": -1})
    assert response.status_code == 422
    assert response.get_json()["code"] == "INVALID_PARAM"

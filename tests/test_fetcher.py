from __future__ import annotations

from datetime import datetime
from pathlib import Path

from backend.config import Settings
from backend.data_fetcher import DataFetcher


def _build_settings() -> Settings:
    return Settings(
        app_name="test",
        environment="test",
        debug=False,
        testing=True,
        host="127.0.0.1",
        port=5000,
        db_path=Path("database/test.db"),
        api_base_url="https://example.com",
        api_ammo_endpoint="/ammo",
        request_timeout_seconds=2,
        request_retries=1,
        request_retry_backoff_seconds=0.1,
        fetch_interval_minutes=60,
        scheduler_enabled=False,
        mock_on_failure=False,
        log_level="INFO",
        log_file=Path("database/test.log"),
    )


def test_normalize_payload() -> None:
    fetcher = DataFetcher(_build_settings())
    payload = {
        "data": [
            {
                "id": "9x19-ap",
                "name": "9x19 AP",
                "grade": "A",
                "caliber": "9x19",
                "price": 111.5,
                "recorded_at": "2026-04-05T10:00:00Z",
            }
        ]
    }
    rows = fetcher._normalize(payload, source="public_api")
    assert len(rows) == 1
    assert rows[0]["ammo_id"] == "9x19-ap"
    assert rows[0]["price"] == 111.5
    assert isinstance(rows[0]["recorded_at"], datetime)

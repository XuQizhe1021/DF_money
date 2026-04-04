from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    debug: bool
    testing: bool
    host: str
    port: int
    db_path: Path
    api_base_url: str
    api_ammo_endpoint: str
    request_timeout_seconds: float
    request_retries: int
    request_retry_backoff_seconds: float
    fetch_interval_minutes: int
    scheduler_enabled: bool
    mock_on_failure: bool
    log_level: str
    log_file: Path

    @staticmethod
    def from_env() -> "Settings":
        root = Path(__file__).resolve().parent.parent
        db_default = root / "database" / "app.db"
        log_default = root / "database" / "fetcher.log"
        return Settings(
            app_name=os.getenv("APP_NAME", "delta-ammo-analyzer"),
            environment=os.getenv("ENVIRONMENT", "development"),
            debug=_to_bool(os.getenv("DEBUG", "false")),
            testing=_to_bool(os.getenv("TESTING", "false")),
            host=os.getenv("HOST", "127.0.0.1"),
            port=int(os.getenv("PORT", "5000")),
            db_path=Path(os.getenv("DB_PATH", str(db_default))),
            api_base_url=os.getenv("API_BASE_URL", "https://df-api.apifox.cn"),
            api_ammo_endpoint=os.getenv("API_AMMO_ENDPOINT", "/api/ammo/prices"),
            request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "8")),
            request_retries=int(os.getenv("REQUEST_RETRIES", "3")),
            request_retry_backoff_seconds=float(
                os.getenv("REQUEST_RETRY_BACKOFF_SECONDS", "1.5")
            ),
            fetch_interval_minutes=int(os.getenv("FETCH_INTERVAL_MINUTES", "60")),
            scheduler_enabled=_to_bool(os.getenv("SCHEDULER_ENABLED", "true")),
            mock_on_failure=_to_bool(os.getenv("MOCK_ON_FAILURE", "true")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            log_file=Path(os.getenv("LOG_FILE", str(log_default))),
        )


def _to_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}

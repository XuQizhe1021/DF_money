from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask

from backend.config import Settings
from backend.data_fetcher import DataFetcher
from backend.database import Database
from backend.routes import api_bp
from backend.service import IngestionService


def create_app(settings: Settings | None = None) -> Flask:
    settings = settings or Settings.from_env()
    app = Flask(__name__)
    app.config["ENV"] = settings.environment
    app.config["DEBUG"] = settings.debug
    app.config["TESTING"] = settings.testing

    logger = _build_logger(settings)
    db = Database(settings.db_path)
    db.init_schema()
    fetcher = DataFetcher(settings)
    service = IngestionService(db=db, fetcher=fetcher, logger=logger)

    app.register_blueprint(api_bp)
    app.extensions["settings"] = settings
    app.extensions["db"] = db
    app.extensions["ingestion_service"] = service
    app.extensions["scheduler"] = _build_scheduler(settings, service)
    return app


def _build_logger(settings: Settings) -> logging.Logger:
    logger = logging.getLogger("delta-ammo")
    if logger.handlers:
        return logger
    logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    settings.log_file.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(settings.log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
    return logger


def _build_scheduler(settings: Settings, service: IngestionService) -> BackgroundScheduler | None:
    if not settings.scheduler_enabled:
        return None
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        service.ingest_once,
        trigger="interval",
        minutes=settings.fetch_interval_minutes,
        id="ammo_fetch_job",
        max_instances=1,
        replace_existing=True,
    )
    scheduler.start()
    return scheduler


app = create_app()


if __name__ == "__main__":
    current_settings: Settings = app.extensions["settings"]
    app.run(host=current_settings.host, port=current_settings.port)

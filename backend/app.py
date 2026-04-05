from __future__ import annotations

import logging
import sqlite3

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, jsonify

from backend.ai_analyzer import AIAnalyzer
from backend.alert_service import AlertService
from backend.config import Settings
from backend.data_fetcher import DataFetcher
from backend.database import Database
from backend.holding_service import HoldingService
from backend.price_monitor import PriceMonitor
from backend.routes_alerts import alerts_bp
from backend.routes_analysis import analysis_bp
from backend.routes_holdings import holdings_bp
from backend.routes import api_bp
from backend.schemas import ApiError
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
    holding_service = HoldingService(db=db)
    alert_service = AlertService(db=db, logger=logger)
    ai_analyzer = AIAnalyzer(db=db, logger=logger)
    price_monitor = PriceMonitor(db=db, alert_service=alert_service)

    app.register_blueprint(api_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(holdings_bp)
    app.register_blueprint(alerts_bp)
    app.extensions["settings"] = settings
    app.extensions["db"] = db
    app.extensions["ingestion_service"] = service
    app.extensions["holding_service"] = holding_service
    app.extensions["alert_service"] = alert_service
    app.extensions["ai_analyzer"] = ai_analyzer
    app.extensions["price_monitor"] = price_monitor
    app.extensions["scheduler"] = _build_scheduler(settings, service, price_monitor)
    _register_error_handlers(app, logger)
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


def _build_scheduler(
    settings: Settings, service: IngestionService, price_monitor: PriceMonitor
) -> BackgroundScheduler | None:
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
    scheduler.add_job(
        price_monitor.evaluate,
        trigger="interval",
        minutes=max(1, min(10, settings.fetch_interval_minutes // 2 or 1)),
        id="price_alert_job",
        max_instances=1,
        replace_existing=True,
    )
    scheduler.start()
    return scheduler


def _register_error_handlers(app: Flask, logger: logging.Logger) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(exc: ApiError) -> tuple:
        return (
            jsonify(
                {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details or {},
                }
            ),
            exc.status_code,
        )

    @app.errorhandler(sqlite3.IntegrityError)
    def handle_db_integrity(_: sqlite3.IntegrityError) -> tuple:
        return jsonify({"code": "DB_CONFLICT", "message": "数据库约束冲突"}), 409

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception) -> tuple:
        logger.exception("未处理异常: %s", exc)
        return jsonify({"code": "INTERNAL_ERROR", "message": "服务内部异常"}), 500


app = create_app()


if __name__ == "__main__":
    current_settings: Settings = app.extensions["settings"]
    app.run(host=current_settings.host, port=current_settings.port)

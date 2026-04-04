from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

api_bp = Blueprint("api", __name__)


@api_bp.get("/health")
def health() -> tuple:
    return jsonify({"status": "ok"}), 200


@api_bp.get("/api/ammo/latest")
def latest_prices() -> tuple:
    db = current_app.extensions["db"]
    rows = db.get_latest_prices()
    return jsonify({"items": rows, "count": len(rows)}), 200


@api_bp.get("/api/ammo/<ammo_id>/history")
def price_history(ammo_id: str) -> tuple:
    db = current_app.extensions["db"]
    days = request.args.get("days", default=7, type=int)
    days = max(1, min(days, 365))
    rows = db.get_history(ammo_id=ammo_id, days=days)
    return jsonify({"ammo_id": ammo_id, "days": days, "items": rows}), 200


@api_bp.post("/api/tasks/fetch-now")
def fetch_now() -> tuple:
    service = current_app.extensions["ingestion_service"]
    result = service.ingest_once()
    status = 200 if result.get("status") == "ok" else 500
    return jsonify(result), status

from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from backend.schemas import ApiError

api_bp = Blueprint("api", __name__)


@api_bp.get("/health")
def health() -> tuple:
    return jsonify({"code": "OK", "message": "ok", "data": {"status": "ok"}}), 200


@api_bp.get("/api/ammo/latest")
def latest_prices() -> tuple:
    db = current_app.extensions["db"]
    rows = db.get_latest_prices()
    return jsonify({"code": "OK", "message": "ok", "data": {"items": rows, "count": len(rows)}}), 200


@api_bp.get("/api/ammo/<ammo_id>/history")
def price_history(ammo_id: str) -> tuple:
    db = current_app.extensions["db"]
    days = request.args.get("days", default=7, type=int)
    if not days or days < 1 or days > 365:
        raise ApiError(code="INVALID_PARAM", message="days 必须在 1~365", status_code=422)
    rows = db.get_history(ammo_id=ammo_id, days=days)
    return jsonify({"code": "OK", "message": "ok", "data": {"ammo_id": ammo_id, "days": days, "items": rows}}), 200


@api_bp.get("/api/ammo/change-ranking")
def change_ranking() -> tuple:
    db = current_app.extensions["db"]
    days = request.args.get("days", default=7, type=int)
    limit = request.args.get("limit", default=3, type=int)
    if not days or days < 1 or days > 365:
        raise ApiError(code="INVALID_PARAM", message="days 必须在 1~365", status_code=422)
    if not limit or limit < 1 or limit > 20:
        raise ApiError(code="INVALID_PARAM", message="limit 必须在 1~20", status_code=422)
    ranking = db.get_change_ranking(days=days, limit=limit)
    return jsonify({"code": "OK", "message": "ok", "data": {"days": days, "limit": limit, **ranking}}), 200


@api_bp.post("/api/tasks/fetch-now")
def fetch_now() -> tuple:
    service = current_app.extensions["ingestion_service"]
    result = service.ingest_once()
    status = 200 if result.get("status") == "ok" else 500
    if status == 200:
        return jsonify({"code": "OK", "message": "抓取完成", "data": result}), status
    return jsonify({"code": "FETCH_ERROR", "message": result.get("message", "抓取失败"), "data": result}), status

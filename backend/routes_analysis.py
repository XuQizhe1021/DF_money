from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from backend.schemas import ApiError, as_bool, as_int, as_str, parse_json_body

analysis_bp = Blueprint("analysis", __name__, url_prefix="/api/analysis")


@analysis_bp.get("/config")
def get_analysis_config() -> tuple:
    db = current_app.extensions["db"]
    config = db.get_ai_config()
    sanitized = dict(config)
    sanitized["api_key"] = "***" if sanitized.get("api_key") else ""
    return jsonify({"code": "OK", "message": "ok", "data": sanitized}), 200


@analysis_bp.put("/config")
def update_analysis_config() -> tuple:
    db = current_app.extensions["db"]
    body = parse_json_body(request.get_json(silent=True))
    payload: dict[str, object] = {}
    if "enabled" in body:
        payload["enabled"] = as_bool(body, "enabled")
    if "provider" in body:
        payload["provider"] = as_str(body, "provider")
    if "base_url" in body:
        payload["base_url"] = as_str(body, "base_url")
    if "model" in body:
        payload["model"] = as_str(body, "model")
    if "api_key" in body:
        payload["api_key"] = as_str(body, "api_key")
    if "timeout_seconds" in body:
        payload["timeout_seconds"] = as_int(body, "timeout_seconds", min_value=1, max_value=120)
    if "max_calls_per_hour" in body:
        payload["max_calls_per_hour"] = as_int(body, "max_calls_per_hour", min_value=1, max_value=120)
    if "cache_ttl_seconds" in body:
        payload["cache_ttl_seconds"] = as_int(body, "cache_ttl_seconds", min_value=10, max_value=86400)
    if not payload:
        raise ApiError(code="INVALID_PARAM", message="未提交可更新字段", status_code=422)
    updated = db.set_ai_config(payload)
    safe = dict(updated)
    safe["api_key"] = "***" if safe.get("api_key") else ""
    return jsonify({"code": "OK", "message": "配置已更新", "data": safe}), 200


@analysis_bp.post("/run")
def run_analysis() -> tuple:
    analyzer = current_app.extensions["ai_analyzer"]
    body = parse_json_body(request.get_json(silent=True))
    ammo_id = as_str(body, "ammo_id")
    days = as_int(body, "days", required=False, min_value=7, max_value=30) or 7
    force_refresh = as_bool(body, "force_refresh", required=False) or False
    try:
        result = analyzer.analyze(ammo_id=ammo_id, days=days, force_refresh=force_refresh)
    except ValueError as exc:
        raise ApiError(code="EMPTY_DATA", message=str(exc), status_code=404) from exc
    return jsonify({"code": "OK", "message": "分析完成", "data": result}), 200

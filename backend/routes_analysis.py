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
    if "daily_signal_enabled" in body:
        payload["daily_signal_enabled"] = as_bool(body, "daily_signal_enabled")
    if "daily_signal_hour" in body:
        payload["daily_signal_hour"] = as_int(body, "daily_signal_hour", min_value=0, max_value=23)
    if not payload:
        raise ApiError(code="INVALID_PARAM", message="未提交可更新字段", status_code=422)
    updated = db.set_ai_config(payload)
    scheduler = current_app.extensions.get("scheduler")
    hour = int(updated.get("daily_signal_hour", 20))
    enabled = bool(updated.get("daily_signal_enabled", True))
    if scheduler:
        job = scheduler.get_job("daily_market_signal_job")
        if enabled:
            if job:
                scheduler.reschedule_job("daily_market_signal_job", trigger="cron", hour=hour, minute=0)
            else:
                analyzer = current_app.extensions["ai_analyzer"]
                scheduler.add_job(
                    analyzer.run_daily_market_signal,
                    trigger="cron",
                    hour=hour,
                    minute=0,
                    id="daily_market_signal_job",
                    max_instances=1,
                    replace_existing=True,
                )
        elif job:
            scheduler.remove_job("daily_market_signal_job")
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


@analysis_bp.get("/daily-signal/latest")
def get_latest_daily_signal() -> tuple:
    db = current_app.extensions["db"]
    row = db.get_latest_unconfirmed_ai_signal_event()
    return jsonify({"code": "OK", "message": "ok", "data": row}), 200


@analysis_bp.post("/daily-signal/confirm")
def confirm_daily_signal() -> tuple:
    db = current_app.extensions["db"]
    body = parse_json_body(request.get_json(silent=True))
    event_id = as_int(body, "event_id", min_value=1)
    if not event_id:
        raise ApiError(code="INVALID_PARAM", message="event_id 无效", status_code=422)
    confirmed = db.confirm_ai_signal_event(event_id)
    if not confirmed:
        raise ApiError(code="NOT_FOUND", message="提醒事件不存在或已确认", status_code=404)
    return jsonify({"code": "OK", "message": "提醒已确认", "data": {"event_id": event_id}}), 200


@analysis_bp.post("/daily-signal/run")
def run_daily_signal_now() -> tuple:
    analyzer = current_app.extensions["ai_analyzer"]
    created = analyzer.run_daily_market_signal(days=7)
    return jsonify({"code": "OK", "message": "执行完成", "data": {"event": created}}), 200

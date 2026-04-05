from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from backend.schemas import ApiError, as_bool, as_float, as_int, parse_json_body

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


@alerts_bp.get("/config")
def get_alert_config() -> tuple:
    service = current_app.extensions["alert_service"]
    return jsonify({"code": "OK", "message": "ok", "data": service.get_config()}), 200


@alerts_bp.put("/config")
def update_alert_config() -> tuple:
    service = current_app.extensions["alert_service"]
    body = parse_json_body(request.get_json(silent=True))
    default_threshold_pct = as_float(
        body,
        "default_threshold_pct",
        required=False,
        min_value=0,
        max_value=10,
    )
    cooldown_minutes = as_int(body, "cooldown_minutes", required=False, min_value=1, max_value=1440)
    console_enabled = as_bool(body, "console_enabled", required=False)
    if default_threshold_pct is None and cooldown_minutes is None and console_enabled is None:
        raise ApiError(code="INVALID_PARAM", message="未提交可更新字段", status_code=422)
    updated = service.update_config(
        default_threshold_pct=default_threshold_pct,
        cooldown_minutes=cooldown_minutes,
        console_enabled=console_enabled,
    )
    return jsonify({"code": "OK", "message": "提醒配置已更新", "data": updated}), 200


@alerts_bp.post("/evaluate")
def evaluate_alerts() -> tuple:
    monitor = current_app.extensions["price_monitor"]
    result = monitor.evaluate()
    return jsonify({"code": "OK", "message": "提醒检查完成", "data": result}), 200


@alerts_bp.get("/events")
def list_alert_events() -> tuple:
    service = current_app.extensions["alert_service"]
    limit = request.args.get("limit", default=50, type=int)
    offset = request.args.get("offset", default=0, type=int)
    unread_only = request.args.get("unread_only", "false").lower() in {"1", "true", "yes", "on"}
    rows = service.list_events(limit=limit, unread_only=unread_only, offset=offset)
    return jsonify({"code": "OK", "message": "ok", "data": {"items": rows, "count": len(rows)}}), 200


@alerts_bp.post("/read")
def mark_alert_read() -> tuple:
    service = current_app.extensions["alert_service"]
    body = parse_json_body(request.get_json(silent=True))
    raw_ids = body.get("event_ids")
    event_ids: list[int] | None = None
    if raw_ids is not None:
        if not isinstance(raw_ids, list):
            raise ApiError(code="INVALID_PARAM", message="event_ids 必须是数组", status_code=422)
        event_ids = []
        for item in raw_ids:
            try:
                event_ids.append(int(item))
            except (TypeError, ValueError) as exc:
                raise ApiError(code="INVALID_PARAM", message="event_ids 存在非法值", status_code=422) from exc
    updated = service.mark_read(event_ids=event_ids)
    return jsonify({"code": "OK", "message": "已标记已读", "data": {"updated": updated}}), 200

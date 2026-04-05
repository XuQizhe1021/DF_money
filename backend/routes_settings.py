from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request
from apscheduler.schedulers.base import BaseScheduler

from backend.schemas import ApiError, as_int, as_str, parse_json_body

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


def _mask_secret(value: str) -> str:
    text = value.strip()
    if not text:
        return ""
    if len(text) <= 6:
        return "*" * len(text)
    return f"{text[:3]}{'*' * (len(text) - 5)}{text[-2:]}"


@settings_bp.get("/data-source")
def get_data_source_config() -> tuple:
    db = current_app.extensions["db"]
    config = db.get_data_source_config()
    data = {
        "api_base_url": config.get("api_base_url", ""),
        "api_ammo_endpoint": config.get("api_ammo_endpoint", ""),
        "openid": _mask_secret(str(config.get("openid", ""))),
        "access_token": _mask_secret(str(config.get("access_token", ""))),
        "fetch_interval_hours": int(config.get("fetch_interval_hours", 1)),
        "has_openid": bool(str(config.get("openid", "")).strip()),
        "has_access_token": bool(str(config.get("access_token", "")).strip()),
    }
    return jsonify({"code": "OK", "message": "ok", "data": data}), 200


@settings_bp.put("/data-source")
def update_data_source_config() -> tuple:
    db = current_app.extensions["db"]
    body = parse_json_body(request.get_json(silent=True))
    payload: dict[str, str | int] = {}
    if "api_base_url" in body:
        payload["api_base_url"] = as_str(body, "api_base_url")
    if "api_ammo_endpoint" in body:
        payload["api_ammo_endpoint"] = as_str(body, "api_ammo_endpoint")
    if "openid" in body:
        payload["openid"] = as_str(body, "openid")
    if "access_token" in body:
        payload["access_token"] = as_str(body, "access_token")
    if "fetch_interval_hours" in body:
        payload["fetch_interval_hours"] = as_int(body, "fetch_interval_hours", min_value=1, max_value=168)
    if not payload:
        raise ApiError(code="INVALID_PARAM", message="未提交可更新字段", status_code=422)
    updated = db.set_data_source_config(payload)
    interval_hours = int(updated.get("fetch_interval_hours", 1))
    scheduler = current_app.extensions.get("scheduler")
    if isinstance(scheduler, BaseScheduler):
        job = scheduler.get_job("ammo_fetch_job")
        if job:
            # 用户可按小时配置自动抓取频率，最小单位1小时。
            scheduler.reschedule_job("ammo_fetch_job", trigger="interval", hours=max(1, interval_hours))
    data = {
        "api_base_url": updated.get("api_base_url", ""),
        "api_ammo_endpoint": updated.get("api_ammo_endpoint", ""),
        "openid": _mask_secret(str(updated.get("openid", ""))),
        "access_token": _mask_secret(str(updated.get("access_token", ""))),
        "fetch_interval_hours": interval_hours,
        "has_openid": bool(str(updated.get("openid", "")).strip()),
        "has_access_token": bool(str(updated.get("access_token", "")).strip()),
    }
    return jsonify({"code": "OK", "message": "数据源配置已更新", "data": data}), 200

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class ApiError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: dict[str, Any] | None = None


def ok(data: Any = None, message: str = "ok") -> dict[str, Any]:
    return {"code": "OK", "message": message, "data": data}


def parse_json_body(payload: Any) -> dict[str, Any]:
    if payload is None:
        raise ApiError(code="INVALID_JSON", message="请求体必须是 JSON", status_code=400)
    if not isinstance(payload, dict):
        raise ApiError(code="INVALID_JSON", message="请求体格式不正确", status_code=400)
    return payload


def as_str(payload: dict[str, Any], key: str, *, required: bool = True, default: str | None = None) -> str | None:
    value = payload.get(key, default)
    if value is None:
        if required:
            raise ApiError(code="INVALID_PARAM", message=f"缺少参数: {key}", status_code=422)
        return None
    if not isinstance(value, str):
        raise ApiError(code="INVALID_PARAM", message=f"参数类型错误: {key}", status_code=422)
    text = value.strip()
    if required and not text:
        raise ApiError(code="INVALID_PARAM", message=f"参数不能为空: {key}", status_code=422)
    return text


def as_float(
    payload: dict[str, Any],
    key: str,
    *,
    required: bool = True,
    min_value: float | None = None,
    max_value: float | None = None,
) -> float | None:
    value = payload.get(key)
    if value is None:
        if required:
            raise ApiError(code="INVALID_PARAM", message=f"缺少参数: {key}", status_code=422)
        return None
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ApiError(code="INVALID_PARAM", message=f"参数必须为数字: {key}", status_code=422) from exc
    if min_value is not None and number < min_value:
        raise ApiError(
            code="INVALID_PARAM",
            message=f"参数 {key} 不能小于 {min_value}",
            status_code=422,
        )
    if max_value is not None and number > max_value:
        raise ApiError(
            code="INVALID_PARAM",
            message=f"参数 {key} 不能大于 {max_value}",
            status_code=422,
        )
    return number


def as_int(
    payload: dict[str, Any],
    key: str,
    *,
    required: bool = True,
    min_value: int | None = None,
    max_value: int | None = None,
) -> int | None:
    value = payload.get(key)
    if value is None:
        if required:
            raise ApiError(code="INVALID_PARAM", message=f"缺少参数: {key}", status_code=422)
        return None
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ApiError(code="INVALID_PARAM", message=f"参数必须为整数: {key}", status_code=422) from exc
    if min_value is not None and number < min_value:
        raise ApiError(code="INVALID_PARAM", message=f"参数 {key} 不能小于 {min_value}", status_code=422)
    if max_value is not None and number > max_value:
        raise ApiError(code="INVALID_PARAM", message=f"参数 {key} 不能大于 {max_value}", status_code=422)
    return number


def as_bool(payload: dict[str, Any], key: str, *, required: bool = True) -> bool | None:
    value = payload.get(key)
    if value is None:
        if required:
            raise ApiError(code="INVALID_PARAM", message=f"缺少参数: {key}", status_code=422)
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lower = value.strip().lower()
        if lower in {"1", "true", "yes", "on"}:
            return True
        if lower in {"0", "false", "no", "off"}:
            return False
    raise ApiError(code="INVALID_PARAM", message=f"参数必须为布尔值: {key}", status_code=422)

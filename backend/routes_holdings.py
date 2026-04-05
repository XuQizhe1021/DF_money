from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from backend.schemas import ApiError, as_bool, as_float, parse_json_body

holdings_bp = Blueprint("holdings", __name__, url_prefix="/api/holdings")


@holdings_bp.post("")
def create_holding() -> tuple:
    service = current_app.extensions["holding_service"]
    body = parse_json_body(request.get_json(silent=True))
    ammo_id = body.get("ammo_id")
    if not isinstance(ammo_id, str) or not ammo_id.strip():
        raise ApiError(code="INVALID_PARAM", message="ammo_id 不能为空", status_code=422)
    purchase_price = as_float(body, "purchase_price", min_value=0)
    threshold_pct = as_float(body, "threshold_pct", required=False, min_value=0, max_value=10)
    purchased_at = body.get("purchased_at")
    if purchased_at is not None and not isinstance(purchased_at, str):
        raise ApiError(code="INVALID_PARAM", message="purchased_at 类型错误", status_code=422)
    created = service.create(
        ammo_id=ammo_id.strip(),
        purchase_price=float(purchase_price),
        threshold_pct=threshold_pct,
        purchased_at=purchased_at,
    )
    return jsonify({"code": "OK", "message": "持仓已创建", "data": created}), 201


@holdings_bp.get("")
def list_holdings() -> tuple:
    service = current_app.extensions["holding_service"]
    include_sold = request.args.get("include_sold", "false").lower() in {"1", "true", "yes", "on"}
    limit = request.args.get("limit", default=100, type=int)
    offset = request.args.get("offset", default=0, type=int)
    rows = service.list(include_sold=include_sold, limit=limit, offset=offset)
    return jsonify({"code": "OK", "message": "ok", "data": {"items": rows, "count": len(rows)}}), 200


@holdings_bp.patch("/<int:holding_id>")
def update_holding(holding_id: int) -> tuple:
    service = current_app.extensions["holding_service"]
    body = parse_json_body(request.get_json(silent=True))
    purchase_price = as_float(body, "purchase_price", required=False, min_value=0)
    threshold_pct = as_float(body, "threshold_pct", required=False, min_value=0, max_value=10)
    if purchase_price is None and threshold_pct is None:
        raise ApiError(code="INVALID_PARAM", message="至少更新一个字段", status_code=422)
    updated = service.update(
        holding_id=holding_id,
        purchase_price=purchase_price,
        threshold_pct=threshold_pct,
    )
    if not updated:
        raise ApiError(code="NOT_FOUND", message="持仓不存在", status_code=404)
    return jsonify({"code": "OK", "message": "持仓已更新", "data": updated}), 200


@holdings_bp.post("/<int:holding_id>/sell")
def sell_holding(holding_id: int) -> tuple:
    service = current_app.extensions["holding_service"]
    sold = service.mark_sold(holding_id)
    if not sold:
        raise ApiError(code="NOT_FOUND", message="持仓不存在", status_code=404)
    return jsonify({"code": "OK", "message": "持仓已标记卖出", "data": sold}), 200


@holdings_bp.delete("/<int:holding_id>")
def delete_holding(holding_id: int) -> tuple:
    service = current_app.extensions["holding_service"]
    deleted = service.delete(holding_id)
    if not deleted:
        raise ApiError(code="NOT_FOUND", message="持仓不存在", status_code=404)
    return jsonify({"code": "OK", "message": "持仓已删除", "data": {"id": holding_id}}), 200

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha1
from typing import Any

from backend.database import Database


class AlertService:
    def __init__(self, db: Database, logger: Any):
        self.db = db
        self.logger = logger

    def get_config(self) -> dict[str, Any]:
        return self.db.get_alert_config()

    def update_config(
        self,
        default_threshold_pct: float | None = None,
        cooldown_minutes: int | None = None,
        console_enabled: bool | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        if default_threshold_pct is not None:
            payload["default_threshold_pct"] = default_threshold_pct
        if cooldown_minutes is not None:
            payload["cooldown_minutes"] = cooldown_minutes
        if console_enabled is not None:
            payload["console_enabled"] = console_enabled
        if not payload:
            return self.get_config()
        return self.db.set_alert_config(payload)

    def should_emit(self, holding_id: int, now: datetime, cooldown_minutes: int) -> bool:
        latest = self.db.get_latest_alert_event(holding_id)
        if not latest:
            return True
        last_at = datetime.fromisoformat(str(latest["created_at"]))
        return now - last_at >= timedelta(minutes=cooldown_minutes)

    def emit_alert(
        self,
        holding_id: int,
        ammo_id: str,
        ammo_name: str,
        current_price: float,
        purchase_price: float,
        threshold_pct: float,
        now: datetime,
    ) -> dict[str, Any] | None:
        # 核心逻辑：按持仓+时间窗口生成幂等键，确保同窗口不会重复落库和提醒
        bucket = now.strftime("%Y%m%d%H%M")
        raw = f"{holding_id}|{bucket}|{round(current_price, 4)}"
        dedupe_key = sha1(raw.encode("utf-8")).hexdigest()
        growth = (current_price - purchase_price) / purchase_price if purchase_price > 0 else 0
        message = (
            f"提醒: {ammo_name} 当前价 {current_price:.2f}，"
            f"相对成本 {purchase_price:.2f} 涨幅 {growth:.2%}，超过阈值 {threshold_pct:.2%}"
        )
        event = self.db.insert_alert_event(
            holding_id=holding_id,
            ammo_id=ammo_id,
            current_price=current_price,
            threshold_pct=threshold_pct,
            message=message,
            dedupe_key=dedupe_key,
        )
        config = self.db.get_alert_config()
        if event and config.get("console_enabled", True):
            self.logger.warning(message)
        return event

    def list_events(self, limit: int = 50, unread_only: bool = False, offset: int = 0) -> list[dict[str, Any]]:
        return self.db.list_alert_events(limit=limit, unread_only=unread_only, offset=offset)

    def mark_read(self, event_ids: list[int] | None = None) -> int:
        return self.db.mark_alerts_read(event_ids=event_ids)

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from backend.alert_service import AlertService
from backend.database import Database


class PriceMonitor:
    def __init__(self, db: Database, alert_service: AlertService):
        self.db = db
        self.alert_service = alert_service

    def evaluate(self) -> dict[str, Any]:
        config = self.alert_service.get_config()
        default_threshold_pct = float(config.get("default_threshold_pct", 0.15))
        cooldown_minutes = int(config.get("cooldown_minutes", 30))
        holdings = self.db.list_holdings(status="holding")
        latest_price_map = self.db.get_latest_price_map()
        now = datetime.now(UTC).replace(tzinfo=None, microsecond=0)
        checked = 0
        triggered = 0
        events: list[dict[str, Any]] = []
        for holding in holdings:
            checked += 1
            ammo_id = holding["ammo_id"]
            current_price = latest_price_map.get(ammo_id)
            if current_price is None:
                continue
            purchase_price = float(holding["purchase_price"])
            threshold_pct = float(holding["threshold_pct"] or default_threshold_pct)
            trigger_price = purchase_price * (1 + threshold_pct)
            if current_price <= trigger_price:
                continue
            if not self.alert_service.should_emit(int(holding["id"]), now=now, cooldown_minutes=cooldown_minutes):
                continue
            event = self.alert_service.emit_alert(
                holding_id=int(holding["id"]),
                ammo_id=ammo_id,
                ammo_name=holding["ammo_name"],
                current_price=float(current_price),
                purchase_price=purchase_price,
                threshold_pct=threshold_pct,
                now=now,
            )
            if event:
                triggered += 1
                events.append(event)
        return {
            "checked": checked,
            "triggered": triggered,
            "events": events,
            "evaluated_at": now.isoformat(),
        }

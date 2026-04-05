from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from backend.database import Database


class HoldingService:
    def __init__(self, db: Database):
        self.db = db

    def create(
        self,
        ammo_id: str,
        purchase_price: float,
        purchased_at: str | None = None,
        threshold_pct: float | None = None,
    ) -> dict[str, Any]:
        created = self.db.create_holding(
            ammo_id=ammo_id,
            purchase_price=purchase_price,
            purchased_at=purchased_at,
            threshold_pct=threshold_pct,
        )
        return self._attach_profit(created)

    def list(self, include_sold: bool = False) -> list[dict[str, Any]]:
        status = None if include_sold else "holding"
        rows = self.db.list_holdings(status=status)
        return [self._attach_profit(row) for row in rows]

    def update(
        self,
        holding_id: int,
        purchase_price: float | None = None,
        threshold_pct: float | None = None,
    ) -> dict[str, Any] | None:
        updated = self.db.update_holding(
            holding_id=holding_id,
            purchase_price=purchase_price,
            threshold_pct=threshold_pct,
        )
        if not updated:
            return None
        return self._attach_profit(updated)

    def mark_sold(self, holding_id: int) -> dict[str, Any] | None:
        sold_at = datetime.now(UTC).replace(tzinfo=None, microsecond=0).isoformat()
        updated = self.db.update_holding(
            holding_id=holding_id,
            status="sold",
            sold_at=sold_at,
        )
        if not updated:
            return None
        return self._attach_profit(updated)

    def delete(self, holding_id: int) -> bool:
        return self.db.delete_holding(holding_id)

    def get(self, holding_id: int) -> dict[str, Any] | None:
        row = self.db.get_holding(holding_id)
        if not row:
            return None
        return self._attach_profit(row)

    def _attach_profit(self, holding: dict[str, Any]) -> dict[str, Any]:
        latest = self.db.get_latest_price(holding["ammo_id"])
        result = dict(holding)
        if not latest:
            result["latest_price"] = None
            result["pnl_value"] = None
            result["pnl_ratio"] = None
            return result
        latest_price = float(latest["price"])
        cost = float(result["purchase_price"])
        pnl_value = latest_price - cost
        pnl_ratio = pnl_value / cost if cost > 0 else None
        result["latest_price"] = latest_price
        result["latest_recorded_at"] = latest["recorded_at"]
        result["pnl_value"] = round(pnl_value, 4)
        result["pnl_ratio"] = round(pnl_ratio, 6) if pnl_ratio is not None else None
        return result

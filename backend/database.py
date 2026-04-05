from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any, Iterator

from backend.models import AmmoInfo, PricePoint


class Database:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._latest_prices_cache: tuple[datetime, list[dict]] | None = None
        self._latest_prices_cache_lock = Lock()

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path, timeout=10, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS ammo_info (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    grade TEXT,
                    caliber TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ammo_id TEXT NOT NULL,
                    price REAL NOT NULL CHECK (price >= 0),
                    recorded_at TEXT NOT NULL,
                    source TEXT NOT NULL DEFAULT 'public_api',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    UNIQUE(ammo_id, recorded_at),
                    FOREIGN KEY (ammo_id) REFERENCES ammo_info(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS holdings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ammo_id TEXT NOT NULL,
                    purchase_price REAL NOT NULL CHECK (purchase_price >= 0),
                    purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
                    status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'sold')),
                    threshold_pct REAL,
                    sold_at TEXT,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (ammo_id) REFERENCES ammo_info(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ai_provider_config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS alert_config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS data_source_config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS price_alert_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    holding_id INTEGER NOT NULL,
                    ammo_id TEXT NOT NULL,
                    current_price REAL NOT NULL,
                    threshold_pct REAL NOT NULL,
                    message TEXT NOT NULL,
                    dedupe_key TEXT NOT NULL,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (holding_id) REFERENCES holdings(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_price_history_ammo_time
                ON price_history(ammo_id, recorded_at DESC);

                CREATE INDEX IF NOT EXISTS idx_holdings_status
                ON holdings(status);

                CREATE INDEX IF NOT EXISTS idx_alert_events_holding_time
                ON price_alert_events(holding_id, created_at DESC);

                CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_events_dedupe_key
                ON price_alert_events(dedupe_key);
                """
            )
            self._ensure_column(conn, "holdings", "threshold_pct", "REAL")
            self._ensure_column(conn, "holdings", "sold_at", "TEXT")
            self._ensure_column(conn, "holdings", "updated_at", "TEXT NOT NULL DEFAULT (datetime('now'))")
            self._seed_default_configs(conn)

    def upsert_ammo(self, records: list[AmmoInfo]) -> None:
        if not records:
            return
        with self.connection() as conn:
            conn.executemany(
                """
                INSERT INTO ammo_info(id, name, grade, caliber, updated_at)
                VALUES(?, ?, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    grade=excluded.grade,
                    caliber=excluded.caliber,
                    updated_at=datetime('now');
                """,
                [(r.id, r.name, r.grade, r.caliber) for r in records],
            )
        self._invalidate_latest_prices_cache()

    def insert_prices(self, points: list[PricePoint]) -> int:
        if not points:
            return 0
        with self.connection() as conn:
            cursor = conn.executemany(
                """
                INSERT OR IGNORE INTO price_history(ammo_id, price, recorded_at, source)
                VALUES(?, ?, ?, ?);
                """,
                [
                    (
                        p.ammo_id,
                        p.price,
                        p.recorded_at.replace(microsecond=0).isoformat(),
                        p.source,
                    )
                    for p in points
                ],
            )
            affected = cursor.rowcount if cursor.rowcount >= 0 else 0
        if affected > 0:
            self._invalidate_latest_prices_cache()
        return affected

    def get_latest_prices(self) -> list[dict]:
        # 热点接口短TTL缓存：减少高频轮询下的重复SQL压力。
        cached = self._get_latest_prices_cache(ttl_seconds=5)
        if cached is not None:
            return cached
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT ai.id, ai.name, ai.grade, ai.caliber, ph.price, ph.recorded_at
                FROM ammo_info ai
                JOIN (
                    SELECT ammo_id, MAX(recorded_at) AS max_recorded_at
                    FROM price_history
                    GROUP BY ammo_id
                ) latest ON latest.ammo_id = ai.id
                JOIN price_history ph
                    ON ph.ammo_id = latest.ammo_id
                    AND ph.recorded_at = latest.max_recorded_at
                ORDER BY ai.name ASC;
                """
            ).fetchall()
            result = [dict(row) for row in rows]
        self._set_latest_prices_cache(result)
        return result

    def get_history(self, ammo_id: str, days: int) -> list[dict]:
        start = (datetime.now(UTC) - timedelta(days=days)).replace(tzinfo=None, microsecond=0).isoformat()
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT ammo_id, price, recorded_at, source
                FROM price_history
                WHERE ammo_id = ? AND recorded_at >= ?
                ORDER BY recorded_at ASC;
                """,
                (ammo_id, start),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_latest_price(self, ammo_id: str) -> dict | None:
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT ai.id, ai.name, ph.price, ph.recorded_at
                FROM ammo_info ai
                JOIN price_history ph ON ph.ammo_id = ai.id
                WHERE ai.id = ?
                ORDER BY ph.recorded_at DESC
                LIMIT 1;
                """,
                (ammo_id,),
            ).fetchone()
            return dict(row) if row else None

    def get_latest_price_map(self) -> dict[str, float]:
        rows = self.get_latest_prices()
        return {row["id"]: float(row["price"]) for row in rows}

    def create_holding(
        self,
        ammo_id: str,
        purchase_price: float,
        purchased_at: str | None = None,
        threshold_pct: float | None = None,
    ) -> dict:
        purchased_at = purchased_at or datetime.now(UTC).replace(tzinfo=None, microsecond=0).isoformat()
        with self.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO holdings(ammo_id, purchase_price, purchased_at, threshold_pct, updated_at)
                VALUES(?, ?, ?, ?, datetime('now'));
                """,
                (ammo_id, purchase_price, purchased_at, threshold_pct),
            )
            row = conn.execute(
                """
                SELECT h.id, h.ammo_id, ai.name AS ammo_name, h.purchase_price, h.purchased_at,
                       h.status, h.threshold_pct, h.sold_at, h.updated_at
                FROM holdings h
                JOIN ammo_info ai ON ai.id = h.ammo_id
                WHERE h.id = ?;
                """,
                (cursor.lastrowid,),
            ).fetchone()
            return dict(row)

    def list_holdings(self, status: str | None = None) -> list[dict]:
        return self.list_holdings_paginated(status=status, limit=200, offset=0)

    def list_holdings_paginated(self, status: str | None = None, limit: int = 200, offset: int = 0) -> list[dict]:
        limit = max(1, min(limit, 500))
        offset = max(0, offset)
        query = """
            SELECT h.id, h.ammo_id, ai.name AS ammo_name, h.purchase_price, h.purchased_at,
                   h.status, h.threshold_pct, h.sold_at, h.updated_at
            FROM holdings h
            JOIN ammo_info ai ON ai.id = h.ammo_id
        """
        params: list[Any] = []
        if status:
            query += " WHERE h.status = ? "
            params.append(status)
        query += " ORDER BY h.id DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])
        with self.connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def get_holding(self, holding_id: int) -> dict | None:
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT h.id, h.ammo_id, ai.name AS ammo_name, h.purchase_price, h.purchased_at,
                       h.status, h.threshold_pct, h.sold_at, h.updated_at
                FROM holdings h
                JOIN ammo_info ai ON ai.id = h.ammo_id
                WHERE h.id = ?;
                """,
                (holding_id,),
            ).fetchone()
            return dict(row) if row else None

    def update_holding(
        self,
        holding_id: int,
        purchase_price: float | None = None,
        threshold_pct: float | None = None,
        status: str | None = None,
        sold_at: str | None = None,
    ) -> dict | None:
        assignments: list[str] = []
        params: list[Any] = []
        if purchase_price is not None:
            assignments.append("purchase_price = ?")
            params.append(purchase_price)
        if threshold_pct is not None:
            assignments.append("threshold_pct = ?")
            params.append(threshold_pct)
        if status is not None:
            assignments.append("status = ?")
            params.append(status)
        if sold_at is not None:
            assignments.append("sold_at = ?")
            params.append(sold_at)
        if not assignments:
            return self.get_holding(holding_id)
        assignments.append("updated_at = datetime('now')")
        params.append(holding_id)
        with self.connection() as conn:
            cursor = conn.execute(
                f"UPDATE holdings SET {', '.join(assignments)} WHERE id = ?;",
                params,
            )
            if cursor.rowcount <= 0:
                return None
        return self.get_holding(holding_id)

    def delete_holding(self, holding_id: int) -> bool:
        with self.connection() as conn:
            cursor = conn.execute("DELETE FROM holdings WHERE id = ?;", (holding_id,))
            return cursor.rowcount > 0

    def get_ai_config(self) -> dict[str, Any]:
        defaults: dict[str, Any] = {
            "enabled": True,
            "provider": "openai_compatible",
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "api_key": "",
            "timeout_seconds": 12.0,
            "max_calls_per_hour": 5,
            "cache_ttl_seconds": 1800,
        }
        with self.connection() as conn:
            rows = conn.execute("SELECT key, value FROM ai_provider_config;").fetchall()
        for row in rows:
            key = row["key"]
            value = row["value"]
            if key in {"enabled"}:
                defaults[key] = value == "1"
            elif key in {"timeout_seconds"}:
                defaults[key] = float(value)
            elif key in {"max_calls_per_hour", "cache_ttl_seconds"}:
                defaults[key] = int(value)
            else:
                defaults[key] = value
        return defaults

    def set_ai_config(self, config: dict[str, Any]) -> dict[str, Any]:
        with self.connection() as conn:
            for key, value in config.items():
                raw = self._to_storage_value(value)
                conn.execute(
                    """
                    INSERT INTO ai_provider_config(key, value, updated_at)
                    VALUES(?, ?, datetime('now'))
                    ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = datetime('now');
                    """,
                    (key, raw),
                )
        return self.get_ai_config()

    def get_alert_config(self) -> dict[str, Any]:
        defaults: dict[str, Any] = {
            "default_threshold_pct": 0.15,
            "cooldown_minutes": 30,
            "console_enabled": True,
        }
        with self.connection() as conn:
            rows = conn.execute("SELECT key, value FROM alert_config;").fetchall()
        for row in rows:
            key = row["key"]
            value = row["value"]
            if key in {"default_threshold_pct"}:
                defaults[key] = float(value)
            elif key in {"cooldown_minutes"}:
                defaults[key] = int(value)
            elif key in {"console_enabled"}:
                defaults[key] = value == "1"
        return defaults

    def set_alert_config(self, config: dict[str, Any]) -> dict[str, Any]:
        with self.connection() as conn:
            for key, value in config.items():
                raw = self._to_storage_value(value)
                conn.execute(
                    """
                    INSERT INTO alert_config(key, value, updated_at)
                    VALUES(?, ?, datetime('now'))
                    ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = datetime('now');
                    """,
                    (key, raw),
                )
        return self.get_alert_config()

    def get_data_source_config(self) -> dict[str, Any]:
        defaults: dict[str, Any] = {
            "api_base_url": "",
            "api_ammo_endpoint": "",
            "openid": "",
            "access_token": "",
            "fetch_interval_hours": 1,
        }
        with self.connection() as conn:
            rows = conn.execute("SELECT key, value FROM data_source_config;").fetchall()
        for row in rows:
            key = str(row["key"])
            if key in defaults:
                if key in {"fetch_interval_hours"}:
                    defaults[key] = int(row["value"])
                else:
                    defaults[key] = str(row["value"])
        return defaults

    def set_data_source_config(self, config: dict[str, Any]) -> dict[str, Any]:
        with self.connection() as conn:
            for key, value in config.items():
                raw = self._to_storage_value(value)
                conn.execute(
                    """
                    INSERT INTO data_source_config(key, value, updated_at)
                    VALUES(?, ?, datetime('now'))
                    ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = datetime('now');
                    """,
                    (key, raw),
                )
        return self.get_data_source_config()

    def get_latest_alert_event(self, holding_id: int) -> dict | None:
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT id, holding_id, ammo_id, current_price, threshold_pct, message, dedupe_key, is_read, created_at
                FROM price_alert_events
                WHERE holding_id = ?
                ORDER BY created_at DESC
                LIMIT 1;
                """,
                (holding_id,),
            ).fetchone()
            return dict(row) if row else None

    def insert_alert_event(
        self,
        holding_id: int,
        ammo_id: str,
        current_price: float,
        threshold_pct: float,
        message: str,
        dedupe_key: str,
    ) -> dict | None:
        with self.connection() as conn:
            try:
                cursor = conn.execute(
                    """
                    INSERT INTO price_alert_events(
                        holding_id, ammo_id, current_price, threshold_pct, message, dedupe_key
                    )
                    VALUES(?, ?, ?, ?, ?, ?);
                    """,
                    (holding_id, ammo_id, current_price, threshold_pct, message, dedupe_key),
                )
            except sqlite3.IntegrityError:
                return None
            row = conn.execute(
                """
                SELECT id, holding_id, ammo_id, current_price, threshold_pct, message, dedupe_key, is_read, created_at
                FROM price_alert_events
                WHERE id = ?;
                """,
                (cursor.lastrowid,),
            ).fetchone()
            return dict(row) if row else None

    def list_alert_events(self, limit: int = 50, unread_only: bool = False, offset: int = 0) -> list[dict]:
        limit = max(1, min(limit, 200))
        offset = max(0, offset)
        query = """
            SELECT id, holding_id, ammo_id, current_price, threshold_pct, message, dedupe_key, is_read, created_at
            FROM price_alert_events
        """
        params: list[Any] = []
        if unread_only:
            query += " WHERE is_read = 0 "
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])
        with self.connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def get_latest_price_details_map(self) -> dict[str, dict[str, Any]]:
        rows = self.get_latest_prices()
        return {
            str(row["id"]): {
                "price": float(row["price"]),
                "recorded_at": str(row["recorded_at"]),
            }
            for row in rows
        }

    def get_change_ranking(self, days: int = 7, limit: int = 3) -> dict[str, list[dict[str, Any]]]:
        days = max(1, min(days, 365))
        limit = max(1, min(limit, 20))
        start = (datetime.now(UTC) - timedelta(days=days)).replace(tzinfo=None, microsecond=0).isoformat()
        with self.connection() as conn:
            gainers_rows = conn.execute(
                """
                WITH scoped AS (
                    SELECT
                        ammo_id,
                        price,
                        ROW_NUMBER() OVER (PARTITION BY ammo_id ORDER BY recorded_at ASC) AS rn_asc,
                        ROW_NUMBER() OVER (PARTITION BY ammo_id ORDER BY recorded_at DESC) AS rn_desc
                    FROM price_history
                    WHERE recorded_at >= ?
                ),
                agg AS (
                    SELECT
                        ammo_id,
                        MAX(CASE WHEN rn_asc = 1 THEN price END) AS first_price,
                        MAX(CASE WHEN rn_desc = 1 THEN price END) AS last_price
                    FROM scoped
                    GROUP BY ammo_id
                    HAVING first_price > 0
                )
                SELECT ai.id AS ammo_id, ai.name, agg.first_price, agg.last_price,
                       (agg.last_price - agg.first_price) / agg.first_price AS pct
                FROM agg
                JOIN ammo_info ai ON ai.id = agg.ammo_id
                ORDER BY pct DESC
                LIMIT ?;
                """,
                (start, limit),
            ).fetchall()
            losers_rows = conn.execute(
                """
                WITH scoped AS (
                    SELECT
                        ammo_id,
                        price,
                        ROW_NUMBER() OVER (PARTITION BY ammo_id ORDER BY recorded_at ASC) AS rn_asc,
                        ROW_NUMBER() OVER (PARTITION BY ammo_id ORDER BY recorded_at DESC) AS rn_desc
                    FROM price_history
                    WHERE recorded_at >= ?
                ),
                agg AS (
                    SELECT
                        ammo_id,
                        MAX(CASE WHEN rn_asc = 1 THEN price END) AS first_price,
                        MAX(CASE WHEN rn_desc = 1 THEN price END) AS last_price
                    FROM scoped
                    GROUP BY ammo_id
                    HAVING first_price > 0
                )
                SELECT ai.id AS ammo_id, ai.name, agg.first_price, agg.last_price,
                       (agg.last_price - agg.first_price) / agg.first_price AS pct
                FROM agg
                JOIN ammo_info ai ON ai.id = agg.ammo_id
                ORDER BY pct ASC
                LIMIT ?;
                """,
                (start, limit),
            ).fetchall()
        return {
            "gainers": [dict(row) for row in gainers_rows],
            "losers": [dict(row) for row in losers_rows],
        }

    def mark_alerts_read(self, event_ids: list[int] | None = None) -> int:
        with self.connection() as conn:
            if not event_ids:
                cursor = conn.execute("UPDATE price_alert_events SET is_read = 1 WHERE is_read = 0;")
                return cursor.rowcount if cursor.rowcount >= 0 else 0
            placeholders = ",".join(["?"] * len(event_ids))
            cursor = conn.execute(
                f"UPDATE price_alert_events SET is_read = 1 WHERE id IN ({placeholders});",
                event_ids,
            )
            return cursor.rowcount if cursor.rowcount >= 0 else 0

    @staticmethod
    def _to_storage_value(value: Any) -> str:
        if isinstance(value, bool):
            return "1" if value else "0"
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        return str(value)

    def _seed_default_configs(self, conn: sqlite3.Connection) -> None:
        defaults = {
            "ai_provider_config": {
                "enabled": "1",
                "provider": "openai_compatible",
                "base_url": "https://api.deepseek.com",
                "model": "deepseek-chat",
                "api_key": "",
                "timeout_seconds": "12",
                "max_calls_per_hour": "5",
                "cache_ttl_seconds": "1800",
            },
            "alert_config": {
                "default_threshold_pct": "0.15",
                "cooldown_minutes": "30",
                "console_enabled": "1",
            },
            "data_source_config": {
                "api_base_url": "",
                "api_ammo_endpoint": "",
                "openid": "",
                "access_token": "",
                "fetch_interval_hours": "1",
            },
        }
        for table, config in defaults.items():
            for key, value in config.items():
                conn.execute(
                    f"""
                    INSERT OR IGNORE INTO {table}(key, value, updated_at)
                    VALUES(?, ?, datetime('now'));
                    """,
                    (key, value),
                )

    @staticmethod
    def _ensure_column(conn: sqlite3.Connection, table: str, column: str, column_type: str) -> None:
        columns = conn.execute(f"PRAGMA table_info({table});").fetchall()
        exists = any(row["name"] == column for row in columns)
        if not exists:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type};")

    def _get_latest_prices_cache(self, ttl_seconds: int) -> list[dict] | None:
        with self._latest_prices_cache_lock:
            pair = self._latest_prices_cache
            if not pair:
                return None
            saved_at, payload = pair
            if (datetime.now(UTC) - saved_at).total_seconds() > ttl_seconds:
                self._latest_prices_cache = None
                return None
            return [dict(row) for row in payload]

    def _set_latest_prices_cache(self, payload: list[dict]) -> None:
        with self._latest_prices_cache_lock:
            self._latest_prices_cache = (datetime.now(UTC), [dict(row) for row in payload])

    def _invalidate_latest_prices_cache(self) -> None:
        with self._latest_prices_cache_lock:
            self._latest_prices_cache = None

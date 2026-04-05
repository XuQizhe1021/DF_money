from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Iterator

from backend.models import AmmoInfo, PricePoint


class Database:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

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
            return cursor.rowcount if cursor.rowcount >= 0 else 0

    def get_latest_prices(self) -> list[dict]:
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
            return [dict(row) for row in rows]

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
        query += " ORDER BY h.id DESC;"
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

    def list_alert_events(self, limit: int = 50, unread_only: bool = False) -> list[dict]:
        limit = max(1, min(limit, 200))
        query = """
            SELECT id, holding_id, ammo_id, current_price, threshold_pct, message, dedupe_key, is_read, created_at
            FROM price_alert_events
        """
        params: list[Any] = []
        if unread_only:
            query += " WHERE is_read = 0 "
        query += " ORDER BY created_at DESC LIMIT ?;"
        params.append(limit)
        with self.connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

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

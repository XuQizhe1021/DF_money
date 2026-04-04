from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Iterator

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
                    FOREIGN KEY (ammo_id) REFERENCES ammo_info(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_price_history_ammo_time
                ON price_history(ammo_id, recorded_at DESC);

                CREATE INDEX IF NOT EXISTS idx_holdings_status
                ON holdings(status);
                """
            )

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

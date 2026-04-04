from __future__ import annotations

import logging

from backend.data_fetcher import DataFetcher, FetcherError
from backend.database import Database


class IngestionService:
    def __init__(self, db: Database, fetcher: DataFetcher, logger: logging.Logger):
        self.db = db
        self.fetcher = fetcher
        self.logger = logger

    def ingest_once(self) -> dict:
        try:
            ammo_records, price_points = self.fetcher.fetch_and_normalize()
            self.db.upsert_ammo(ammo_records)
            inserted = self.db.insert_prices(price_points)
            return {
                "status": "ok",
                "ammo_count": len(ammo_records),
                "price_points": len(price_points),
                "inserted": inserted,
            }
        except FetcherError as exc:
            self.logger.exception("抓取失败: %s", exc)
            return {"status": "error", "message": str(exc)}
        except Exception as exc:
            self.logger.exception("入库失败: %s", exc)
            return {"status": "error", "message": f"存储失败: {exc}"}

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import requests

from backend.config import Settings
from backend.models import AmmoInfo, PricePoint


class FetcherError(Exception):
    pass


class DataFetcher:
    def __init__(self, settings: Settings):
        self.settings = settings

    def fetch_and_normalize(self) -> tuple[list[AmmoInfo], list[PricePoint]]:
        try:
            raw = self._fetch_remote()
            normalized = self._normalize(raw, source="public_api")
        except FetcherError:
            if not self.settings.mock_on_failure:
                raise
            normalized = self._mock_payload()
        ammo_records: list[AmmoInfo] = []
        price_points: list[PricePoint] = []
        for item in normalized:
            ammo_records.append(
                AmmoInfo(
                    id=item["ammo_id"],
                    name=item["name"],
                    grade=item.get("grade"),
                    caliber=item.get("caliber"),
                )
            )
            price_points.append(
                PricePoint(
                    ammo_id=item["ammo_id"],
                    price=item["price"],
                    recorded_at=item["recorded_at"],
                    source=item["source"],
                )
            )
        return ammo_records, price_points

    def _fetch_remote(self) -> Any:
        url = f"{self.settings.api_base_url.rstrip('/')}/{self.settings.api_ammo_endpoint.lstrip('/')}"
        last_exception: Exception | None = None
        for attempt in range(1, self.settings.request_retries + 1):
            try:
                response = requests.get(url, timeout=self.settings.request_timeout_seconds)
                if response.status_code >= 500:
                    raise FetcherError(f"远端服务错误: status={response.status_code}")
                if response.status_code >= 400:
                    raise FetcherError(f"请求参数或鉴权错误: status={response.status_code}")
                return response.json()
            except requests.Timeout as exc:
                last_exception = exc
            except requests.RequestException as exc:
                last_exception = exc
            if attempt < self.settings.request_retries:
                time.sleep(self.settings.request_retry_backoff_seconds * attempt)
        raise FetcherError(f"请求失败: {last_exception}")

    def _normalize(self, payload: Any, source: str) -> list[dict]:
        if isinstance(payload, dict):
            records = payload.get("data", payload.get("items", payload.get("list", payload)))
            if isinstance(records, dict):
                records = [records]
        elif isinstance(payload, list):
            records = payload
        else:
            records = []
        normalized: list[dict] = []
        for item in records:
            if not isinstance(item, dict):
                continue
            ammo_id = self._first_non_empty(item, ["ammo_id", "id", "ammoId", "code"])
            name = self._first_non_empty(item, ["name", "ammo_name", "ammoName"])
            if not ammo_id and name:
                ammo_id = f"ammo-{name}".lower().replace(" ", "-")
            if not ammo_id or not name:
                continue
            price_value = self._first_non_empty(item, ["price", "latest_price", "value"])
            try:
                price = float(price_value)
            except (TypeError, ValueError):
                continue
            recorded_at_raw = self._first_non_empty(
                item, ["recorded_at", "recordedAt", "updated_at", "timestamp"]
            )
            recorded_at = self._parse_datetime(recorded_at_raw)
            normalized.append(
                {
                    "ammo_id": str(ammo_id),
                    "name": str(name),
                    "grade": self._first_non_empty(item, ["grade", "tier"]),
                    "caliber": self._first_non_empty(item, ["caliber", "type"]),
                    "price": price,
                    "recorded_at": recorded_at,
                    "source": source,
                }
            )
        if not normalized:
            raise FetcherError("未获得可用行情数据")
        return normalized

    def _mock_payload(self) -> list[dict]:
        now = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
        return [
            {
                "ammo_id": "9x19-ap",
                "name": "9x19 AP",
                "grade": "A",
                "caliber": "9x19",
                "price": 118.0,
                "recorded_at": now,
                "source": "mock",
            },
            {
                "ammo_id": "5.56-m855a1",
                "name": "5.56 M855A1",
                "grade": "S",
                "caliber": "5.56",
                "price": 286.0,
                "recorded_at": now,
                "source": "mock",
            },
        ]

    @staticmethod
    def _first_non_empty(data: dict, keys: list[str]) -> Any:
        for key in keys:
            value = data.get(key)
            if value not in (None, ""):
                return value
        return None

    @staticmethod
    def _parse_datetime(value: Any) -> datetime:
        if value is None:
            return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value), tz=timezone.utc).replace(
                tzinfo=None, microsecond=0
            )
        if isinstance(value, str):
            text = value.strip().replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(text)
                if dt.tzinfo:
                    return dt.astimezone(timezone.utc).replace(tzinfo=None, microsecond=0)
                return dt.replace(microsecond=0)
            except ValueError:
                return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
        return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)

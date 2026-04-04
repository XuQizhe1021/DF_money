from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class AmmoInfo:
    id: str
    name: str
    grade: str | None = None
    caliber: str | None = None


@dataclass(frozen=True)
class PricePoint:
    ammo_id: str
    price: float
    recorded_at: datetime
    source: str = "public_api"

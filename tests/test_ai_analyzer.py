from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import requests

from backend.ai_analyzer import AIAnalyzer
from backend.database import Database
from backend.models import AmmoInfo, PricePoint


class _DummyLogger:
    def warning(self, *_: object, **__: object) -> None:
        return

    def exception(self, *_: object, **__: object) -> None:
        return


class _MockResponse:
    def __init__(self, body: dict):
        self._body = body

    def raise_for_status(self) -> None:
        return

    def json(self) -> dict:
        return self._body


def _seed_db(tmp_path: Path) -> Database:
    db = Database(tmp_path / "ai.db")
    db.init_schema()
    db.upsert_ammo([AmmoInfo(id="9x19-ap", name="9x19 AP", grade="A", caliber="9x19")])
    now = datetime.now(UTC).replace(tzinfo=None, microsecond=0)
    db.insert_prices(
        [
            PricePoint(ammo_id="9x19-ap", price=100 + idx, recorded_at=now - timedelta(days=7 - idx))
            for idx in range(8)
        ]
    )
    return db


def test_analyze_fallback_without_key(tmp_path: Path) -> None:
    db = _seed_db(tmp_path)
    db.set_ai_config({"enabled": True, "api_key": "", "max_calls_per_hour": 5})
    analyzer = AIAnalyzer(db=db, logger=_DummyLogger())
    result = analyzer.analyze(ammo_id="9x19-ap", days=7)
    assert result["source"] == "rule_based"
    assert "risk_tips" in result["result"]


def test_analyze_cache_and_ai_output(tmp_path: Path) -> None:
    db = _seed_db(tmp_path)
    db.set_ai_config({"enabled": True, "api_key": "sk-test", "max_calls_per_hour": 5})
    called = {"count": 0}

    def _fake_post(*_: object, **__: object) -> _MockResponse:
        called["count"] += 1
        return _MockResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '{"price_position":"低位","action":"买入","risk_level":"中",'
                                '"risk_tips":["注意波动"],"reason":"测试返回"}'
                            )
                        }
                    }
                ]
            }
        )

    analyzer = AIAnalyzer(db=db, logger=_DummyLogger(), request_func=_fake_post)
    first = analyzer.analyze(ammo_id="9x19-ap", days=7)
    second = analyzer.analyze(ammo_id="9x19-ap", days=7)
    assert first["source"] == "ai"
    assert second["cache_hit"] is True
    assert called["count"] == 1


def test_analyze_timeout_fallback(tmp_path: Path) -> None:
    db = _seed_db(tmp_path)
    db.set_ai_config({"enabled": True, "api_key": "sk-test", "max_calls_per_hour": 5})

    def _timeout(*_: object, **__: object) -> None:
        raise requests.Timeout("timeout")

    analyzer = AIAnalyzer(db=db, logger=_DummyLogger(), request_func=_timeout)
    result = analyzer.analyze(ammo_id="9x19-ap", days=7)
    assert result["source"] == "rule_based"

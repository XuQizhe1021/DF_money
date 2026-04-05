from __future__ import annotations

import json
import re
from collections import deque
from datetime import UTC, datetime, timedelta
from hashlib import sha1
from statistics import mean
from typing import Any, Callable

import requests

from backend.database import Database


class AIAnalyzer:
    def __init__(
        self,
        db: Database,
        logger: Any,
        request_func: Callable[..., requests.Response] | None = None,
        now_func: Callable[[], datetime] | None = None,
    ):
        self.db = db
        self.logger = logger
        self.request_func = request_func or requests.post
        self.now_func = now_func or (lambda: datetime.now(UTC))
        self._cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
        self._calls: deque[datetime] = deque()

    def analyze(self, ammo_id: str, days: int = 7, force_refresh: bool = False) -> dict[str, Any]:
        history = self.db.get_history(ammo_id=ammo_id, days=days)
        if not history:
            raise ValueError("该子弹缺少历史数据，无法分析")
        settings = self.db.get_ai_config()
        latest_recorded_at = history[-1]["recorded_at"]
        cache_key = self._build_cache_key(ammo_id, days, latest_recorded_at, settings.get("model", ""))
        cache_ttl = int(settings.get("cache_ttl_seconds", 1800))
        if not force_refresh:
            cached = self._from_cache(cache_key, ttl_seconds=cache_ttl)
            if cached:
                return cached
        # 核心逻辑：强制做调用频率限制，避免高频请求造成费用失控
        if not self._allow_request(int(settings.get("max_calls_per_hour", 5))):
            fallback = self._rule_based_analysis(ammo_id=ammo_id, history=history, reason="触发频率限制，已自动回退规则分析")
            self._cache[cache_key] = (self.now_func(), fallback)
            return fallback
        if not settings.get("enabled", True) or not settings.get("api_key"):
            fallback = self._rule_based_analysis(ammo_id=ammo_id, history=history, reason="未配置可用 API Key，已自动回退规则分析")
            self._cache[cache_key] = (self.now_func(), fallback)
            return fallback
        try:
            result = self._request_ai(ammo_id=ammo_id, history=history, settings=settings)
            final = {
                "ammo_id": ammo_id,
                "days": days,
                "source": "ai",
                "result": result,
                "generated_at": self.now_func().replace(microsecond=0).isoformat(),
            }
            self._cache[cache_key] = (self.now_func(), final)
            return final
        except Exception:
            fallback = self._rule_based_analysis(ammo_id=ammo_id, history=history, reason="AI 服务异常，已自动回退规则分析")
            self._cache[cache_key] = (self.now_func(), fallback)
            return fallback

    def _request_ai(self, ammo_id: str, history: list[dict], settings: dict[str, Any]) -> dict[str, Any]:
        prices = [float(item["price"]) for item in history]
        market_hints = "市场规律：每日6-9点低谷，周末活跃高峰。"
        prompt = (
            "你是子弹行情分析助手，请只返回 JSON。"
            "字段必须包含：price_position(action可选值:买入/卖出/观望/持有)、action、risk_level、risk_tips(list)、reason。"
            f"\nammo_id={ammo_id}\nprices={prices}\n{market_hints}"
        )
        base_url = str(settings.get("base_url", "https://api.deepseek.com")).rstrip("/")
        endpoint = f"{base_url}/chat/completions"
        model = str(settings.get("model", "deepseek-chat"))
        headers = {
            "Authorization": f"Bearer {settings.get('api_key', '')}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        response = self.request_func(
            endpoint,
            headers=headers,
            json=payload,
            timeout=float(settings.get("timeout_seconds", 12)),
        )
        response.raise_for_status()
        body = response.json()
        content = body["choices"][0]["message"]["content"]
        parsed = self._parse_json_content(content)
        return {
            "price_position": str(parsed.get("price_position", "持平")),
            "action": str(parsed.get("action", "观望")),
            "risk_level": str(parsed.get("risk_level", "中")),
            "risk_tips": parsed.get("risk_tips", ["注意市场波动风险"]),
            "reason": str(parsed.get("reason", "模型未提供详细原因")),
        }

    @staticmethod
    def _parse_json_content(content: str) -> dict[str, Any]:
        text = content.strip()
        fenced_match = re.search(r"```json\s*(.*?)\s*```", text, flags=re.S)
        if fenced_match:
            text = fenced_match.group(1)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {
                "price_position": "持平",
                "action": "观望",
                "risk_level": "中",
                "risk_tips": ["AI 返回格式异常，建议人工复核"],
                "reason": text[:200],
            }

    def _rule_based_analysis(self, ammo_id: str, history: list[dict], reason: str) -> dict[str, Any]:
        prices = [float(item["price"]) for item in history]
        current = prices[-1]
        ma = mean(prices)
        variance = max(prices) - min(prices) if prices else 0.0
        # 核心逻辑：简化 RSI 判断，避免 AI 不可用时系统完全失效
        gains = []
        losses = []
        for idx in range(1, len(prices)):
            diff = prices[idx] - prices[idx - 1]
            if diff >= 0:
                gains.append(diff)
            else:
                losses.append(abs(diff))
        avg_gain = mean(gains) if gains else 0.001
        avg_loss = mean(losses) if losses else 0.001
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        if current >= ma * 1.05:
            position = "高位"
            action = "卖出"
        elif current <= ma * 0.95:
            position = "低位"
            action = "买入"
        else:
            position = "持平"
            action = "观望"
        risk_level = "高" if variance / max(ma, 1) >= 0.25 else "中"
        if rsi >= 70:
            risk_tips = ["短期可能超买，注意回撤风险", reason]
        elif rsi <= 30:
            risk_tips = ["短期可能超卖，注意抄底节奏", reason]
        else:
            risk_tips = ["价格波动处于中性区间", reason]
        return {
            "ammo_id": ammo_id,
            "days": len(history),
            "source": "rule_based",
            "result": {
                "price_position": position,
                "action": action,
                "risk_level": risk_level,
                "risk_tips": risk_tips,
                "reason": f"MA={ma:.2f}, RSI={rsi:.2f}, current={current:.2f}",
            },
            "generated_at": self.now_func().replace(microsecond=0).isoformat(),
        }

    def _allow_request(self, max_calls_per_hour: int) -> bool:
        now = self.now_func()
        one_hour_ago = now - timedelta(hours=1)
        while self._calls and self._calls[0] < one_hour_ago:
            self._calls.popleft()
        if len(self._calls) >= max_calls_per_hour:
            return False
        self._calls.append(now)
        return True

    def _from_cache(self, cache_key: str, ttl_seconds: int) -> dict[str, Any] | None:
        pair = self._cache.get(cache_key)
        if not pair:
            return None
        saved_at, payload = pair
        if (self.now_func() - saved_at).total_seconds() > ttl_seconds:
            self._cache.pop(cache_key, None)
            return None
        reused = dict(payload)
        reused["cache_hit"] = True
        return reused

    @staticmethod
    def _build_cache_key(ammo_id: str, days: int, latest_recorded_at: str, model: str) -> str:
        raw = f"{ammo_id}|{days}|{latest_recorded_at}|{model}"
        return sha1(raw.encode("utf-8")).hexdigest()

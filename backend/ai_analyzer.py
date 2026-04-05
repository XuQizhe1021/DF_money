from __future__ import annotations

import json
import re
from collections import deque
from collections import defaultdict
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

    def run_daily_market_signal(self, days: int = 7) -> dict[str, Any] | None:
        market_rows = self.db.get_market_snapshot(days=days)
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        meta: dict[str, dict[str, str]] = {}
        for row in market_rows:
            ammo_id = str(row["ammo_id"])
            grouped[ammo_id].append({"price": float(row["price"]), "recorded_at": str(row["recorded_at"])})
            meta[ammo_id] = {"name": str(row["name"]), "caliber": str(row["caliber"])}
        if not grouped:
            return None
        settings = self.db.get_ai_config()
        if settings.get("enabled", True) and settings.get("api_key"):
            try:
                ai_result = self._request_market_signal_ai(grouped, meta, settings, days)
            except Exception:
                ai_result = self._build_rule_market_signal(grouped, meta, days, "AI 批量分析失败，已降级规则分析")
        else:
            ai_result = self._build_rule_market_signal(grouped, meta, days, "AI 未启用或缺少 Key，已降级规则分析")
        events = [item for item in ai_result.get("events", []) if item.get("action") in {"建议加仓", "建议售出"}]
        if not events:
            return None
        markdown = self._build_market_signal_markdown(days, events, ai_result.get("summary", ""))
        level = "高" if any(str(item.get("risk_level")) == "高" for item in events) else "中"
        created = self.db.create_ai_signal_event(
            title=f"每日全市场 AI 建议（{days}天）",
            level=level,
            message_markdown=markdown,
            suggested_actions=events,
        )
        return created

    def _request_ai(self, ammo_id: str, history: list[dict], settings: dict[str, Any]) -> dict[str, Any]:
        payload_context = self._build_ai_context(ammo_id=ammo_id, history=history)
        prompt = (
            "你是子弹行情分析助手。请严格只返回 JSON 对象，不要输出任何多余文本。"
            "字段必须包含：price_position、action、risk_level、risk_tips、reason、reason_markdown。"
            "action 只允许：买入/卖出/观望/持有。"
            "risk_level 只允许：低/中/高。"
            "risk_tips 必须是长度2~5的字符串数组。"
            "reason 必须为简洁中文。"
            "reason_markdown 必须为可直接渲染的 Markdown，至少包含“结论”“依据”“风险”三个小节。"
            "你必须结合输入数据进行判断，不得编造输入中不存在的价格点。"
            f"\n输入数据如下：\n{json.dumps(payload_context, ensure_ascii=False)}"
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
            "risk_tips": self._normalize_risk_tips(parsed.get("risk_tips")),
            "reason": str(parsed.get("reason", "模型未提供详细原因")),
            "reason_markdown": str(parsed.get("reason_markdown", parsed.get("reason", "模型未提供详细原因"))),
        }

    def _request_market_signal_ai(
        self,
        grouped: dict[str, list[dict[str, Any]]],
        meta: dict[str, dict[str, str]],
        settings: dict[str, Any],
        days: int,
    ) -> dict[str, Any]:
        context = self._build_market_signal_context(grouped, meta, days)
        prompt = (
            "你是市场级子弹行情分析助手。请严格只返回 JSON 对象。"
            "返回字段必须是：summary、events。"
            "events 为数组，每项字段：ammo_id、name、action、risk_level、reason。"
            "action 只允许：建议加仓/建议售出/观望。"
            "risk_level 只允许：低/中/高。"
            "只在证据充分时给“建议加仓/建议售出”，否则给“观望”。"
            f"\n输入数据：\n{json.dumps(context, ensure_ascii=False)}"
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
        parsed = self._parse_json_content(body["choices"][0]["message"]["content"])
        events = parsed.get("events", [])
        normalized_events: list[dict[str, Any]] = []
        if isinstance(events, list):
            for item in events:
                if not isinstance(item, dict):
                    continue
                normalized_events.append(
                    {
                        "ammo_id": str(item.get("ammo_id", "")),
                        "name": str(item.get("name", "")),
                        "action": str(item.get("action", "观望")),
                        "risk_level": str(item.get("risk_level", "中")),
                        "reason": str(item.get("reason", "")),
                    }
                )
        return {"summary": str(parsed.get("summary", "AI 未返回摘要")), "events": normalized_events}

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
        markdown_reason = (
            "### 结论\n"
            f"- 建议：{action}\n"
            f"- 位置：{position}\n"
            f"- 风险等级：{risk_level}\n\n"
            "### 依据\n"
            f"- 当前价：{current:.2f}\n"
            f"- 均值(MA)：{ma:.2f}\n"
            f"- RSI：{rsi:.2f}\n\n"
            "### 风险\n"
            + "\n".join([f"- {item}" for item in risk_tips])
        )
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
                "reason_markdown": markdown_reason,
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

    @staticmethod
    def _normalize_risk_tips(raw: Any) -> list[str]:
        if isinstance(raw, list):
            tips = [str(item).strip() for item in raw if str(item).strip()]
            if tips:
                return tips[:5]
        return ["注意市场波动风险"]

    def _build_ai_context(self, ammo_id: str, history: list[dict]) -> dict[str, Any]:
        prices = [float(item["price"]) for item in history]
        recorded = [str(item["recorded_at"]) for item in history]
        current = prices[-1]
        lowest = min(prices)
        highest = max(prices)
        avg = mean(prices)
        pct_change = ((current - prices[0]) / prices[0]) if prices and prices[0] > 0 else 0.0
        sampled: list[dict[str, Any]] = []
        if len(prices) <= 20:
            sampled = [{"t": t, "p": p} for t, p in zip(recorded, prices)]
        else:
            step = max(1, len(prices) // 20)
            for idx in range(0, len(prices), step):
                sampled.append({"t": recorded[idx], "p": prices[idx]})
            sampled.append({"t": recorded[-1], "p": prices[-1]})
        return {
            "ammo_id": ammo_id,
            "points": len(prices),
            "stats": {
                "current": round(current, 4),
                "lowest": round(lowest, 4),
                "highest": round(highest, 4),
                "average": round(avg, 4),
                "pct_change": round(pct_change, 6),
            },
            "sampled_series": sampled[:25],
            "market_hints": {
                "refresh_pattern": "价格波动可能较快，需关注短周期变化与回撤风险",
                "usage_scope": "仅辅助分析，不构成投资建议",
            },
        }

    @staticmethod
    def _build_market_signal_context(
        grouped: dict[str, list[dict[str, Any]]], meta: dict[str, dict[str, str]], days: int
    ) -> dict[str, Any]:
        items: list[dict[str, Any]] = []
        for ammo_id, rows in grouped.items():
            prices = [float(row["price"]) for row in rows]
            if len(prices) < 2 or prices[0] <= 0:
                continue
            pct = (prices[-1] - prices[0]) / prices[0]
            vol = (max(prices) - min(prices)) / max(mean(prices), 1)
            info = meta.get(ammo_id, {})
            items.append(
                {
                    "ammo_id": ammo_id,
                    "name": info.get("name", ammo_id),
                    "caliber": info.get("caliber", ""),
                    "points": len(prices),
                    "first_price": round(prices[0], 4),
                    "last_price": round(prices[-1], 4),
                    "pct_change": round(pct, 6),
                    "volatility": round(vol, 6),
                }
            )
        items.sort(key=lambda x: abs(float(x["pct_change"])), reverse=True)
        return {"days": days, "total_ammo": len(items), "items": items[:200]}

    @staticmethod
    def _build_rule_market_signal(
        grouped: dict[str, list[dict[str, Any]]],
        meta: dict[str, dict[str, str]],
        days: int,
        summary: str,
    ) -> dict[str, Any]:
        events: list[dict[str, Any]] = []
        for ammo_id, rows in grouped.items():
            prices = [float(row["price"]) for row in rows]
            if len(prices) < 2 or prices[0] <= 0:
                continue
            pct = (prices[-1] - prices[0]) / prices[0]
            info = meta.get(ammo_id, {})
            if pct <= -0.1:
                action = "建议加仓"
                risk_level = "中"
            elif pct >= 0.12:
                action = "建议售出"
                risk_level = "中"
            else:
                action = "观望"
                risk_level = "低"
            events.append(
                {
                    "ammo_id": ammo_id,
                    "name": info.get("name", ammo_id),
                    "action": action,
                    "risk_level": risk_level,
                    "reason": f"{days}天涨跌幅 {(pct * 100):.2f}%",
                }
            )
        return {"summary": summary, "events": events}

    @staticmethod
    def _build_market_signal_markdown(days: int, events: list[dict[str, Any]], summary: str) -> str:
        lines = [
            "### 每日市场提醒事件",
            f"- 分析窗口：最近{days}天",
            f"- 提醒数量：{len(events)}",
            "",
            "### 总结",
            f"- {summary or '已基于全市场数据生成提醒'}",
            "",
            "### 事件明细",
        ]
        for item in events[:50]:
            lines.append(
                f"- {item.get('name') or item.get('ammo_id')}：{item.get('action')}（风险{item.get('risk_level')}）- {item.get('reason')}"
            )
        return "\n".join(lines)

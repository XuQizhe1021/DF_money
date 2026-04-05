# 三角洲行动子弹行情分析系统（阶段2）

本仓库已完成 M2“核心功能开发”：在阶段1抓取与入库能力基础上，新增 AI 分析、持仓管理、价格监控提醒、统一错误处理与关键测试覆盖。系统仅做行情分析与辅助决策，不登录账号、不执行自动交易、默认不上传云端数据。

## 技术选型

后端使用 Flask + APScheduler + SQLite，HTTP 调用使用 requests。AI 适配层默认兼容 OpenAI Chat Completions 格式，可接 DeepSeek / OpenAI / Claude 兼容网关。

## 目录结构

```text
backend/
  app.py
  config.py
  data_fetcher.py
  database.py
  models.py
  routes.py
  routes_analysis.py
  routes_holdings.py
  routes_alerts.py
  service.py
  schemas.py
  ai_analyzer.py
  holding_service.py
  alert_service.py
  price_monitor.py
database/
scripts/
  init_db.py
  test_api.py
tests/
  test_api.py
  test_fetcher.py
```

## 环境准备

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
```

## 初始化数据库

```bash
python scripts/init_db.py
```

## 启动服务

```bash
python -m backend.app
```

默认地址 `http://127.0.0.1:5000`。

## 基础接口

- `GET /health`
- `GET /api/ammo/latest`
- `GET /api/ammo/<ammo_id>/history?days=7`
- `POST /api/tasks/fetch-now`

## 阶段2新增接口

### AI 分析

- `GET /api/analysis/config` 读取 AI 配置（API Key 脱敏）
- `PUT /api/analysis/config` 更新 AI 配置
- `POST /api/analysis/run` 运行 AI 分析（自动缓存与频控，失败回退规则分析）

请求示例：

```json
{
  "ammo_id": "9x19-ap",
  "days": 7,
  "force_refresh": false
}
```

响应示例：

```json
{
  "code": "OK",
  "message": "分析完成",
  "data": {
    "ammo_id": "9x19-ap",
    "days": 7,
    "source": "ai",
    "result": {
      "price_position": "低位",
      "action": "买入",
      "risk_level": "中",
      "risk_tips": ["注意短期波动"],
      "reason": "均线附近回升"
    }
  }
}
```

### 持仓管理

- `POST /api/holdings` 新增持仓
- `GET /api/holdings?include_sold=false` 持仓列表（含实时盈亏估算）
- `PATCH /api/holdings/<id>` 更新成本价或阈值
- `POST /api/holdings/<id>/sell` 标记卖出
- `DELETE /api/holdings/<id>` 删除持仓

请求示例：

```json
{
  "ammo_id": "9x19-ap",
  "purchase_price": 120,
  "threshold_pct": 0.2
}
```

响应示例：

```json
{
  "code": "OK",
  "message": "持仓已创建",
  "data": {
    "id": 1,
    "ammo_id": "9x19-ap",
    "purchase_price": 120.0,
    "latest_price": 156.0,
    "pnl_value": 36.0,
    "pnl_ratio": 0.3
  }
}
```

### 提醒与监控

- `GET /api/alerts/config` 读取提醒配置
- `PUT /api/alerts/config` 更新全局阈值/冷却时间/控制台提醒开关
- `POST /api/alerts/evaluate` 手动触发一次监控检查
- `GET /api/alerts/events?unread_only=true` 获取页面通知数据
- `POST /api/alerts/read` 标记提醒已读

请求示例：

```json
{
  "default_threshold_pct": 0.15,
  "cooldown_minutes": 30,
  "console_enabled": true
}
```

响应示例：

```json
{
  "code": "OK",
  "message": "提醒检查完成",
  "data": {
    "checked": 3,
    "triggered": 1,
    "events": [
      {
        "holding_id": 1,
        "ammo_id": "9x19-ap",
        "message": "提醒: 9x19 AP 当前价 156.00，相对成本 120.00 涨幅 30.00%，超过阈值 20.00%"
      }
    ]
  }
}
```

## 本地联调脚本

```bash
python scripts/test_api.py
```

## 配置说明

关键配置在 `.env` 中集中维护：

- `API_BASE_URL`、`API_AMMO_ENDPOINT`：公开行情 API 地址
- `FETCH_INTERVAL_MINUTES`：定时抓取间隔（分钟）
- `REQUEST_TIMEOUT_SECONDS`、`REQUEST_RETRIES`：外部请求超时与重试
- `DB_PATH`：SQLite 文件路径
- `MOCK_ON_FAILURE`：公开 API 不可用时是否自动回退到 mock 数据源

AI 与提醒配置通过 API 动态管理，默认写入 SQLite 的 `ai_provider_config` 和 `alert_config` 表，无需在日志中输出敏感字段。

## 测试

```bash
pytest -q
```

当前新增测试覆盖 AI 回退/缓存、持仓 CRUD 与盈亏、提醒触发与冷却防抖、非法参数与异常路径。

# 三角洲行动子弹行情分析系统（M4 可交付版）

本仓库已完成 M4“集成测试与优化”：在阶段1~3功能基础上，完成全链路验证、性能优化、UI/UX优化、交付文档与本地构建脚本。系统仅做行情分析与辅助决策，不登录账号、不执行自动交易、默认不上传云端数据。

## 技术选型

后端使用 Flask + APScheduler + SQLite，HTTP 调用使用 requests。AI 适配层默认兼容 OpenAI Chat Completions 格式，可接 DeepSeek / OpenAI / Claude 兼容网关。

## 版本亮点（M4）

- 全流程集成测试覆盖正常流、异常流、边界流并形成报告
- 新增涨跌榜聚合接口，前端请求从N次降为1次
- 持仓与提醒列表支持分页参数，持仓盈亏计算路径优化
- 最新价热点查询增加短TTL缓存，降低重复SQL压力
- 图表渲染与交互优化（缓存、防抖、长序列采样）
- 新增用户手册、API接入教程、性能报告、发布说明
- 新增本地一键构建脚本 `scripts/build_local.ps1`

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
frontend/
  src/
    views/
    components/
    api/
    stores/
  package.json
  README.md
database/
scripts/
  init_db.py
  test_api.py
  build_local.ps1
  build_local.bat
tests/
  test_api.py
  test_fetcher.py
  test_integration_m4.py
docs/
  test-report.md
  performance-report.md
  user-guide.md
  api-integration-guide.md
  release-notes.md
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

## 前端启动（M3）

```bash
cd frontend
npm install
npm run dev
```

默认地址 `http://localhost:5173`，开发环境会将 `/api` 代理到后端 `http://127.0.0.1:5000`。

## 一键构建与质量门禁（M4）

PowerShell：

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\build_local.ps1
```

批处理：

```bash
.\scripts\build_local.bat
```

脚本会顺序执行后端依赖安装、pytest、前端依赖安装、typecheck、build。

## 基础接口

- `GET /health`
- `GET /api/ammo/latest`
- `GET /api/ammo/<ammo_id>/history?days=7`
- `GET /api/ammo/change-ranking?days=7&limit=3`
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
- `GET /api/holdings?include_sold=false&limit=100&offset=0` 持仓列表（含实时盈亏估算）
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
- `GET /api/alerts/events?unread_only=true&limit=50&offset=0` 获取页面通知数据
- `POST /api/alerts/read` 标记提醒已读

### 系统设置（新增）

- `GET /api/settings/data-source` 读取数据源配置（敏感字段脱敏）
- `PUT /api/settings/data-source` 更新数据源配置（支持 `api_base_url`、`api_ammo_endpoint`、`openid`、`access_token`）

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

AI、提醒与数据源配置通过 API 动态管理，默认写入 SQLite 的 `ai_provider_config`、`alert_config`、`data_source_config` 表，无需在日志中输出敏感字段。

## 小白用户配置指引

在前端导航进入“系统设置”页面，按步骤完成：

1. 先配置“数据源配置”（接口地址、openid、access_token）
2. 再配置“智能体配置”（base_url、model、api_key）
3. 返回“行情看板”点击“刷新行情”验证是否成功

若不配置 openid/access_token，系统会尝试默认公开接口；若公开接口不可用，则按 `MOCK_ON_FAILURE` 回退。

## 测试

```bash
pytest -q
```

当前新增测试覆盖 AI 回退/缓存、持仓 CRUD 与盈亏、提醒触发与冷却防抖、非法参数与异常路径。

## 文档入口（M4）

- 集成测试报告：`docs/test-report.md`
- 性能优化报告：`docs/performance-report.md`
- 用户手册：`docs/user-guide.md`
- API接入教程：`docs/api-integration-guide.md`
- 发布说明：`docs/release-notes.md`

## 免责声明

- 本项目仅用于学习与辅助分析，不构成投资建议
- 用户应自行承担第三方API服务可用性与费用
- 请勿在日志、截图、文档中暴露任何密钥与敏感配置

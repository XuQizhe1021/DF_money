# 三角洲行动子弹行情分析系统（阶段1）

本仓库当前完成 M1“基础搭建”：本地拉取公开行情、标准化后写入 SQLite，并提供最小可用 REST API 与定时抓取能力。系统仅做行情分析与决策辅助，不登录账号、不执行自动交易、默认不上传云端数据。

## 技术选型

阶段1默认使用 Flask。原因是当前目标是快速搭建可运行后端骨架、验证抓取到入库到查询的闭环，Flask 在样板代码和调试路径上更轻量，便于后续分层扩展。定时任务使用 APScheduler，数据库使用 SQLite。

## 目录结构

```text
backend/
  app.py
  config.py
  data_fetcher.py
  database.py
  models.py
  routes.py
  service.py
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

## 本地联调脚本

```bash
python scripts/test_api.py
```

## 测试

```bash
pytest -q
```

## 配置说明

关键配置在 `.env` 中集中维护：

- `API_BASE_URL`、`API_AMMO_ENDPOINT`：公开行情 API 地址
- `FETCH_INTERVAL_MINUTES`：定时抓取间隔（分钟）
- `REQUEST_TIMEOUT_SECONDS`、`REQUEST_RETRIES`：外部请求超时与重试
- `DB_PATH`：SQLite 文件路径
- `MOCK_ON_FAILURE`：公开 API 不可用时是否自动回退到 mock 数据源

## 已知限制

当前公开示例地址可能返回 404 或字段不稳定，因此默认保留了 mock 回退链路用于保证系统可测试与可演示。若接入官方稳定接口，仅需调整 `.env` 中 API 地址及字段映射规则即可。

## Flask 迁移 FastAPI 差异清单

1. `backend/routes.py` 从 Blueprint 改为 APIRouter 与 Pydantic 响应模型。
2. `backend/app.py` 从 Flask 应用工厂改为 FastAPI 实例与 lifespan 生命周期。
3. 定时任务与 `Database`、`IngestionService` 可原样复用，注册方式改为 startup/shutdown。
4. 测试从 Flask test client 改为 `httpx.AsyncClient` 或 `TestClient`。

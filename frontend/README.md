# 三角洲行动子弹行情分析系统前端（M3）

本目录为阶段3前端实现，技术栈为 Vue 3 + TypeScript + Pinia + Vue Router + ECharts。系统仅用于行情展示与分析，不涉及游戏账号行为与自动交易。

## 功能覆盖

- 行情看板：价格排行、7日涨跌幅榜、更新时间、提醒检查
- 走势图：7日/30日切换、子弹筛选、高响应折线图
- AI建议：触发分析、建议展示、风险等级标签
- 持仓管理：新增/编辑/删除/卖出、盈亏状态展示
- 通知能力：页面通知条 + 浏览器通知授权与触发

## 目录说明

```text
src/
  api/
    client.ts
    modules/
  components/
  router/
  stores/
  types/
  views/
  App.vue
  main.ts
```

## 运行方式

在项目根目录先启动后端（默认 5000）：

```bash
python -m backend.app
```

新开终端进入前端目录安装依赖并启动：

```bash
cd frontend
npm install
npm run dev
```

默认访问 `http://localhost:5173`，Vite 已配置 `/api` 与 `/health` 代理到 `http://127.0.0.1:5000`。

## 联调要点

前端已接入以下核心接口：

- `GET /api/ammo/latest`
- `GET /api/ammo/:ammo_id/history?days=7|30`
- `POST /api/analysis/run`
- `GET/POST/PATCH/DELETE /api/holdings...`
- `POST /api/alerts/evaluate`
- `GET /api/alerts/events?unread_only=true`
- `POST /api/alerts/read`

统一请求封装位于 `src/api/client.ts`，包含：

- 超时控制（默认10秒）
- 重试策略（默认失败后线性退避重试）
- 统一错误归一化与页面通知提示

## 构建命令

```bash
npm run build
```

构建产物输出到 `frontend/dist`。

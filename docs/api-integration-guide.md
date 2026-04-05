# API接入教程（M4）

## 1. 基础约定

- 基础地址：`http://127.0.0.1:5000`
- 返回格式：

```json
{
  "code": "OK",
  "message": "ok",
  "data": {}
}
```

## 2. 核心接口

### 2.1 行情

- `GET /api/ammo/latest` 获取最新行情
- `GET /api/ammo/{ammo_id}/history?days=7` 获取历史数据
- `GET /api/ammo/change-ranking?days=7&limit=3` 获取7日涨跌榜聚合结果
- `POST /api/tasks/fetch-now` 立即触发采集入库

### 2.2 AI分析

- `GET /api/analysis/config` 获取AI配置（Key脱敏）
- `PUT /api/analysis/config` 更新AI配置
- `POST /api/analysis/run` 执行分析

请求示例：

```json
{
  "ammo_id": "9x19-ap",
  "days": 7,
  "force_refresh": true
}
```

### 2.3 持仓

- `POST /api/holdings` 新增持仓
- `GET /api/holdings?include_sold=false&limit=100&offset=0` 持仓分页列表
- `PATCH /api/holdings/{id}` 更新持仓
- `POST /api/holdings/{id}/sell` 标记卖出
- `DELETE /api/holdings/{id}` 删除持仓

### 2.4 提醒

- `GET /api/alerts/config` 获取提醒配置
- `PUT /api/alerts/config` 更新提醒配置
- `POST /api/alerts/evaluate` 手动触发提醒评估
- `GET /api/alerts/events?unread_only=true&limit=50&offset=0` 获取提醒列表
- `POST /api/alerts/read` 标记已读

## 3. 错误码建议处理

- `INVALID_PARAM`：参数非法，客户端应修正参数再重试
- `NOT_FOUND`：目标资源不存在，客户端应提示用户刷新数据
- `EMPTY_DATA`：无历史数据无法分析，客户端应提示先抓取行情
- `FETCH_ERROR`：采集失败，客户端可提示“稍后重试/切换mock”
- `INTERNAL_ERROR`：服务内部异常，建议记录请求ID并重试

## 4. 安全建议

- 不在日志和前端明文展示 API Key
- 客户端仅保存必要配置，不缓存敏感字段
- 接口失败时优先展示可恢复提示，而非技术栈细节

## API

成功格式：`{ "data": ... }`；错误格式：`{ "error": { "code": "INVALID_STATE", "message": "..." } }`。

- `GET /api/queue`：窗口、当天及活跃号码、最近事件、配置的原子快照。
- `GET /api/windows`：四个窗口。
- `POST /api/tickets`：匿名创建号码，201；请求参数示例见下方。
- `POST /api/windows/:id/:action`：窗口操作，200。
- action 支持 `online`, `ready`, `cancel-ready`, `call-next`, `recall`, `start`, `complete`, `no-show`, `mode`, `pause`, `resume`, `offline`。
- mode 请求体：`{"mode":"MANUAL"}` 或 `{"mode":"AUTO"}`；其余动作不需参数。
- Zod 校验失败 400，窗口不存在 404，状态冲突/空队列 409，非预期服务端错误 500。

取号请求示例：

```json
{
  "issues": [
    { "category": "account", "subcategory": "password-reset" },
    { "category": "network", "subcategory": "vpn" }
  ]
}
```

API 校验分类代码与父子归属，重复组合会去重，最多保存全部 33 个不同小分类。显式空数组、非法代码、错误归属和格式错误的 JSON 返回 400。为兼容旧客户端，空请求体或 `{}` 默认保存 `other / unsure`；历史记录的空列表仍保留为空。创建结果及队列快照均返回类型明确的 `issues` 数组，`ticket:created` 事件 payload 同时记录需求。需求和号码在同一事务中写入。

实时事件：`queue:updated`、`ticket:created`、`ticket:called`、`ticket:recalled`、`ticket:completed`、`window:updated`，另有 started/no-show 审计事件。事件携带唯一 ID、时间、相关 ticket/window 及 payload；类型见 `src/types/queue.ts`。

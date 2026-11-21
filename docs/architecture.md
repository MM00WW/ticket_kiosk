## 架构及一致性

```text
src/
  main.tsx             浏览器入口，根据 URL 选择四个页面
  style.css            普通 CSS，按页面分段
  components/          kiosk.tsx、operator.tsx、display.tsx、admin.tsx；shared、ui 共用组件
  hooks/useQueue.ts    Socket.IO、状态重取、事件去重
  server/
    queueService.ts      取号、FIFO 分配、窗口状态、服务流程、事务及事件
    db.ts                SQLite 连接、建表和读取 SQL
    api.ts               API 返回格式与错误处理
    socketServer.ts      提交后的实时广播
  lib/                 分类校验与通用工具
  types/               queue.ts：明确列出的 JSON 数据结构与 Socket.IO 事件类型
  i18n/                界面词典、三语语音模板
scripts/               数据库初始化、生产集成验证
tests/                 Vitest 需求校验与 API 契约回归测试
docs/                  使用、部署、架构、API 与验证文档
server.ts              Express API、页面和 Socket.IO 服务器
start-server.bat       Windows 启动脚本
```

数据库直接使用 better-sqlite3 执行参数化 SQL。写操作使用同步 immediate 事务，事务内读取和更新号码、窗口并保存事件，失败整体回滚。保留号码日期加序号、当前号码等唯一约束，不实现额外重试框架。分配统一经过 allocate 函数。

每次写操作直接收集自己产生的事件，提交成功后才向 Socket.IO 广播。SQLite 是最终状态来源；客户端收到通知后重新 GET 快照，重连后同样重新同步。请求版本号防止旧 HTTP 响应覆盖新状态。广播屏按事件 ID 去重。每 15 秒轮询作为补充恢复机制。

采用单个 B 服务器进程。若在提交后广播前进程终止，数据库保留正确状态，客户端会在重连/轮询时恢复；未提供消息队列或事务 outbox 保证每条语音必达，这是本 MVP 的边界。

未来打印可在取号成功后接入独立打印适配器；取号服务与页面已分离，目前不连接打印机。

## 维护约定

- HTTP 路由集中在 server.ts，业务写操作进入 server/queueService.ts。
- components 和 hooks 不在运行时引入 server；共享 DTO 使用 import type。
- dist、node_modules 和 tsbuildinfo 是生成产物；data 是持久化数据。
- 工具配置保留根目录，使用 npm ci 与 package-lock.json 可复现安装。

## 建议阅读顺序

1. 从 src/components/kiosk.tsx 的 submit 函数开始，了解取号提交。
2. 查看 server.ts 的 POST /api/tickets，了解请求如何进入后端。
3. 阅读 src/server/queueService.ts，按编号了解取号、分配、窗口操作、服务流程、事务及事件。
4. 阅读 src/hooks/useQueue.ts，了解通知触发刷新、断线重连和轮询。
5. 对照 src/types/queue.ts 和 src/server/db.ts，了解浏览器数据与数据库字段。

四种业务界面分别保留一个文件，导航使用普通 a 链接。开发时 Vite 中间件提供页面热更新，生产时 Express 提供 dist 静态文件。当天业务当天结束，页面与分配只使用当天号码，不新增隔夜补偿或权限系统。

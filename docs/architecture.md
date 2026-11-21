## 架构及一致性

```text
src/
  app/                 页面与薄层 Route Handlers
    api/               tickets、queue、windows、窗口操作
  components/          kiosk.tsx、operator.tsx、display.tsx、admin.tsx；shared、ui 共用组件
  hooks/useQueue.ts    Socket.IO、状态重取、事件去重
  server/
    queueService.ts      取号、FIFO 分配、窗口状态、服务流程、事务及事件
    db.ts                Prisma 数据库连接
    api.ts               API 返回格式与错误处理
    socketServer.ts      提交后的实时广播
  lib/                 分类校验与通用工具
  types/               queue.ts：明确列出的 JSON 数据结构与 Socket.IO 事件类型
  i18n/                界面词典、三语语音模板
prisma/
  schema.prisma
  migrations/          可部署的 SQL Migration
  seed.ts              幂等初始化四个窗口及配置
scripts/               数据库初始化、生产集成验证
tests/                 Vitest 需求校验与 API 契约回归测试
docs/                  使用、部署、架构、API 与验证文档
server.ts              Next.js + Socket.IO 自定义服务器
start-server.bat       Windows 启动脚本
```

写操作在 SQLite 事务开始时先写入配置表以取得数据库写锁，再查询与更新状态。号码有复合唯一约束；分配对 WAITING 票据和预期状态/空闲窗口执行条件更新，窗口 `currentTicketId` 有唯一约束。冲突有限重试，事务整体回滚，不使用进程内锁保证一致性。所有分配只通过 queueService.ts 内的 allocate 函数。

事件与业务状态在同一事务中保存；本次事务创建的事件直接收集到列表，提交成功后才向 Socket.IO 广播，回滚时丢弃列表。SQLite 是最终状态来源；客户端收到通知后重新 GET 快照，重连后同样重新同步。请求版本号防止较旧 HTTP 响应覆盖较新状态。广播屏按事件 ID 去重。每 15 秒轮询作为补充恢复机制。

采用单个 B 服务器进程。若在提交后广播前进程终止，数据库保留正确状态，客户端会在重连/轮询时恢复；未提供消息队列或事务 outbox 保证每条语音必达，这是本 MVP 的边界。

未来打印可在取号成功后接入独立打印适配器；取号服务与页面已分离，目前不连接打印机。

## 维护约定

- 路由保留在 app，业务写操作进入 server/queueService.ts。
- components 和 hooks 不在运行时引入 server；共享 DTO 使用 import type。
- generated、.next、node_modules 和 tsbuildinfo 是生成产物；data 是持久化数据。
- 工具配置保留根目录，使用 npm ci 与 package-lock.json 可复现安装。

## 建议阅读顺序

1. 从 src/components/kiosk.tsx 的 submit 函数开始，了解取号提交。
2. 查看 src/app/api/tickets/route.ts，了解请求如何进入后端。
3. 阅读 src/server/queueService.ts，按编号了解取号、分配、窗口操作、服务流程、事务及事件。
4. 阅读 src/hooks/useQueue.ts，了解通知触发刷新、断线重连和轮询。
5. 对照 src/types/queue.ts 和 prisma/schema.prisma，了解浏览器数据与数据库字段。

四种业务界面分别保留一个文件。Next.js 页面和 API 的目录决定访问地址，因此保留其目录结构。数据库与实时通知独立于业务文件，便于分别理解和维护。

## 精简说明

- 界面统一使用浅色主题。
- 队列快照只返回页面实际使用的 tickets、windows、events 和 date。
- SystemSetting 暂保留作为现有 SQLite 写锁的载体；speechLanguage 不是前端语音设置，页面语言在浏览器内管理。
- 根目录 dist 是旧静态构建产物，当前构建和启动仅使用 .next。

## 手工叫号

现场号码只能通过 call-next 分配到当前空闲窗口，按创建时间与序号取最早等待者。无自动分配模式或就绪状态；取号和完成服务不分配下一位。迁移保留业务记录并将历史 READY 窗口转为 IDLE。

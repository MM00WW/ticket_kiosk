## 架构及一致性

```text
src/
  app/                 页面与薄层 Route Handlers
    api/               tickets、queue、windows、窗口操作
  components/          kiosk、operator、display、admin；shared、ui 共用组件
  hooks/useQueue.ts    Socket.IO、状态重取、事件去重
  server/services/
    ticketService.ts   日期、取号、权威快照
    allocationService.ts  手动/自动统一 FIFO 原子分配
    windowService.ts   窗口动作、模式与状态机
    serviceSession.ts  开始、完成、未到和重复叫号
    eventService.ts    持久化操作事件
    transaction.ts    写事务、冲突重试、提交后广播
  server/              Prisma 单例、API 错误、Socket 服务
  lib/                 分类校验与通用工具
  types/               JSON DTO、双向 Socket.IO 事件类型
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

写操作在 SQLite 事务开始时先写入配置表以取得数据库写锁，再查询与更新状态。号码有复合唯一约束；分配对 WAITING 票据和预期状态/空闲窗口执行条件更新，窗口 `currentTicketId` 有唯一约束。冲突有限重试，事务整体回滚，不使用进程内锁保证一致性。所有分配只通过 allocationService。

事件与业务状态在同一事务中保存，提交成功后才向 Socket.IO 广播。SQLite 是最终状态来源；客户端收到通知后重新 GET 快照，重连后同样重新同步。请求版本号防止较旧 HTTP 响应覆盖较新状态。广播屏按事件 ID 去重。每 15 秒轮询作为补充恢复机制。

采用单个 B 服务器进程。若在提交后广播前进程终止，数据库保留正确状态，客户端会在重连/轮询时恢复；未提供消息队列或事务 outbox 保证每条语音必达，这是本 MVP 的边界。

未来打印可在取号成功后接入独立打印适配器；取号服务与页面已分离，目前不连接打印机。

## 维护约定

- 路由保留在 app，业务写操作进入 server/services。
- components 和 hooks 不在运行时引入 server；共享 DTO 使用 import type。
- generated、.next、node_modules 和 tsbuildinfo 是生成产物；data 是持久化数据。
- 工具配置保留根目录，使用 npm ci 与 package-lock.json 可复现安装。

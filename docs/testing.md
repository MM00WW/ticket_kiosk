## 验证

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:production
npm run test:windows
```

- Vitest：10 项基础回归覆盖需求校验、旧客户端与历史数据兼容、API HTTP 契约。原 README 所称的 30 项历史测试源文件在当前目录缺失，未将其计作现存测试。
- 生产集成：独立端口 3101 / `data/production-test.db`，检查七个页面、完整验收流程、真实 Socket.IO 广播、重复叫号事件 ID、API 错误、两级需求校验及旧客户端兼容、手工叫号、取号后保持等待及断线重连后的需求恢复、服务器重启后持久化。
- `test:production` 必须先完成 build。测试只清理专用测试数据库，不清理 `queue.db`。不要把测试数据库配置成正式数据。
- `test:windows` 在 Windows 上通过真正的 `start-server.bat` 启动生产服务器，并再次执行完整集成验证和重启持久化检查。
- Windows BAT 可通过 `cmd /c start-server.bat` 运行。真实声音输出、远端设备网络和物理触摸屏需要在现场确认。

尚未包含：认证、ITSM/AD 集成、打印、复杂报表、历史分页、运维自动启动。这些不属于当前 MVP。页面统一使用浅色主题，语言选择按当前页面会话生效。

配置依据：[Prisma 7 SQLite adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite)、[Next.js 自定义服务器](https://nextjs.org/docs/app/guides/custom-server)。

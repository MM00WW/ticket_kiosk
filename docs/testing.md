## 验证

```powershell
npm run typecheck
npm test
npm run build
npm run test:production
npm run test:windows
```

- Vitest：10 项基础回归覆盖需求校验、旧客户端与历史数据兼容、API HTTP 契约。原 README 所称的 30 项历史测试源文件在当前目录缺失，未将其计作现存测试。
- 生产集成：独立端口 3101 / `data/production-test.db`，检查七个页面、手动/自动流程、Socket.IO 广播及重连、重启持久化、12 个同时取号请求、两个窗口同时 FIFO 分配、重复操作回滚、未到及暂停恢复。
- `test:production` 必须先完成 build。测试只清理专用测试数据库，不清理 `queue.db`。不要把测试数据库配置成正式数据。
- `test:windows` 在 Windows 上通过真正的 `start-server.bat` 启动生产服务器，并再次执行完整集成验证和重启持久化检查。
- Windows BAT 可通过 `cmd /c start-server.bat` 运行。真实声音输出、远端设备网络和物理触摸屏需要在现场确认。

尚未包含：认证、ITSM/AD 集成、打印、复杂报表、历史分页、运维自动启动。这些不属于当前 MVP。浅/深色切换和语言选择按当前页面会话生效。

数据库直接使用 better-sqlite3。浏览器人工检查覆盖取号选择和提交、工程师页、广播屏和总览布局。

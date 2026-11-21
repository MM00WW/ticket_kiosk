# DeskFlow — IT Service Desk Queue

局域网 IT 服务台叫号系统。React + TypeScript + Vite + Express + SQLite + Socket.IO。样式使用普通 CSS，数据库直接执行 SQL，不使用 ORM 或额外 UI 组件库。

## 开发启动

需要 Node.js >=24 和 npm。首次安装复制配置；已有 .env 请保留。

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

打开 http://localhost:3000/kiosk 。工程师入口 /operator/1，广播入口 /display，管理入口 /admin。

## 生产运行

```powershell
npm run build
npm start
```

Windows 可双击 start-server.bat。开发与生产均通过 server.ts 挂载 Express 和 Socket.IO，端口为 3000。开发时 Vite 提供页面热更新；生产时直接提供 dist 中的静态文件。修改后端需要重启，生产环境修改前端后需要重新 build。

数据库启动时自动建表和初始化窗口，不重置已有数据。也可单独运行 npm run db:init。没有登录、隔夜补偿和多进程部署。

## 从哪里读代码

```text
server.ts                    服务入口、HTTP 接口、Socket.IO
src/
  main.tsx                   浏览器入口和四页面选择
  style.css                  普通 CSS，按页面分段
  components/
    queue-app.tsx            导航、主题、语言、语音和页面组合
    kiosk.tsx                分类选择和取号
    operator.tsx             工程师窗口工作台
    display.tsx              广播屏
    admin.tsx                总览
    shared/                  号码列表、需求标签和时间显示
    ui/button.tsx            原生按钮封装，没有组件库
  hooks/useQueue.ts          请求、Socket.IO 和刷新
  server/
    db.ts                    SQLite 建表、连接和读取 SQL
    queueService.ts          取号、分配、窗口操作和事务
    api.ts                   返回格式和业务错误
    socketServer.ts          提交后广播
  types/queue.ts             普通接口类型
  lib/issueCatalog.ts        需求分类及校验
  i18n/                      中英德文案
```

建议从 kiosk.tsx 的 submit 读到 queueService.ts 的 createTicket，再看 windowAction 和 db.ts。

## 检查

```powershell
npm run typecheck
npm test
npm run format:check
npm run build
npm run test:production
npm run test:windows
```

## 文档

- [架构与目录约定](docs/architecture.md)
- [安装与部署](docs/deployment.md)
- [数据维护与备份](docs/data.md)
- [使用流程](docs/usage.md)
- [API](docs/api.md)
- [验证方法](docs/testing.md)

src 为源码，scripts 为维护脚本，tests 为回归测试。数据库默认位于 data/queue.db，不提交版本管理；构建不会清除数据库。旧 Prisma 数据库继续使用原表名和字段，无需重新生成客户端。

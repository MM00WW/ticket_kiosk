# DeskFlow — IT Service Desk Queue

局域网 IT 服务台叫号系统。Next.js App Router + React + TypeScript + Tailwind CSS + Prisma / SQLite + Socket.IO。

## 开发启动

需要 Node.js >=24 和 npm。首次安装复制配置；已有 .env 请保留。

```powershell
Copy-Item .env.example .env
npm ci
npm run db:init
npm run dev
```

打开 http://localhost:3000/kiosk 。工程师入口 /operator/1，广播入口 /display，管理入口 /admin。

## 生产运行

```powershell
npm run build
npm start
```

Windows 可双击 start-server.bat。开发与生产均通过 server.ts 挂载 Next.js 和 Socket.IO。

## 检查

```powershell
npm run typecheck
npm run lint
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

src 为源码，prisma 为数据库定义，scripts 为维护脚本，tests 为回归测试。数据库默认位于 data/queue.db，不提交版本管理；构建不会清除数据库。

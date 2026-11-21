## 安装与启动

建议 Node.js **24 LTS** 和 npm。当前开发机已在 Windows、Node 26.5.0 上通过测试。SQLite 驱动为原生依赖；使用 LTS 通常能直接下载预编译版本，如果本机需要编译则安装 Visual Studio Build Tools 的 C++ 工具链。

在 PowerShell 中：

```powershell
cd F:\叫号系统
Copy-Item .env.example .env   # 首次安装时；已有配置不要覆盖
npm install
npm run db:init
npm run dev
```

生产部署：

```powershell
npm run build
npm run start
```

也可以双击 **start-server.bat**。脚本切换到项目目录、检查 Node、首次复制配置、按需安装依赖、迁移并初始化窗口、缺少生产构建时执行构建，最后启动生产服务。修改源代码后请手动重新 `npm run build`。启动失败会显示错误并暂停窗口，返回非零退出码；自动化运行可设置 DESKFLOW_NO_PAUSE=1 跳过暂停。端口占用通常表示已有服务运行，应先停止旧实例，避免重复启动。保持命令窗口运行；Ctrl+C 停止服务器。

`npm run dev` 和 `npm run start` 均启动自定义 `server.ts`，同一 HTTP 服务提供 Next.js 和 Socket.IO。不要改用 `next start`，它不会挂载本项目的 Socket.IO 服务。

## 访问地址和设备

| 设备                | 地址                               |
| ------------------- | ---------------------------------- |
| B：服务器及取号终端 | http://localhost:3000/kiosk        |
| A1                  | http://B的局域网IP:3000/operator/1 |
| A2                  | http://B的局域网IP:3000/operator/2 |
| A3                  | http://B的局域网IP:3000/operator/3 |
| A4                  | http://B的局域网IP:3000/operator/4 |
| C：广播显示终端     | http://B的局域网IP:3000/display    |
| 管理总览            | http://B的局域网IP:3000/admin      |

服务监听 `0.0.0.0:3000`。在 B 上运行 `ipconfig` 查找当前网卡 IPv4 地址（建议给 B 配置 DHCP 地址保留）。其他设备不能使用 `localhost` 指向 B。

Windows 防火墙首次弹窗允许 Node 在**专用网络**访问，或在“高级安全 Windows Defender 防火墙”创建 TCP 3000 入站规则，只允许专用配置文件和本地子网。管理员 PowerShell 示例（由部署人员执行）：

```powershell
New-NetFirewallRule -DisplayName "DeskFlow LAN" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private -RemoteAddress LocalSubnet
```

无需另外开放 Socket.IO 端口。客户端支持 WebSocket 和 HTTP polling。四台工程师设备、B、C 必须能互相访问局域网。工程师和管理入口按 MVP 要求不设登录，仅在可信内部网络部署。

## 数据持久化及配置

```dotenv
DATABASE_URL="file:./data/queue.db"
PORT=3000
QUEUE_TIMEZONE=Europe/Berlin
```

数据库相对路径以**项目根目录**为基准，默认持久化在 `data/queue.db`，与 `dist` 分开；构建不会删除数据。配置变更后重启服务。日期按 `QUEUE_TIMEZONE` 时区计算，默认柏林；中国部署可设置 `Asia/Shanghai`。

每天新号从 A001 开始，`queueDate + sequence` 唯一，超过 999 后继续 A1000。按照当前约定，当天事当天结束，不处理隔夜业务。页面与分配只使用当天号码，不自动删除历史数据。当天统计按取号日期归属；事件显示最近 100 条。

启动时自动建表并补充缺少的窗口，不重置状态、模式或号码，也可运行 `npm run db:init`。保留原表名、字段、毫秒时间和需求 JSON，兼容旧 Prisma 数据库；旧迁移记录表不再使用，保留无影响。

备份时先停止服务，复制整个 `data` 目录；恢复时停止服务后替换该目录，再启动。不要删除正在使用的数据库。production-test.db 和 compatibility-test.db 是验证用数据库。

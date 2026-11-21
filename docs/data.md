## 数据持久化及配置

```dotenv
DATABASE_URL="file:./data/queue.db"
PORT=3000
QUEUE_TIMEZONE=Europe/Berlin
```

数据库相对路径以**项目根目录**为基准，默认持久化在 `data/queue.db`，不在 `.next` 内；构建不会删除数据。配置变更后重启服务。建议设置 B 的系统时钟自动同步。日期按 `QUEUE_TIMEZONE` 的 IANA 时区计算，默认柏林；中国部署可设置 `Asia/Shanghai`。

每天新号从 A001 开始，`queueDate + sequence` 唯一，超过 999 后继续 A1000。前一天尚未处理的 WAITING/CALLED/SERVING 号码保留并按原始创建时间优先处理；号码在跨日时可相同，队列和工程师界面同时显示日期。当天统计按取号日期归属；跨日服务完成计入原取号日期。历史数据保存在数据库中，管理页显示当天与仍活跃的历史号码，以及最近 100 个事件。

`npm run db:init` 使用已有迁移，不清空数据，seed 不重置窗口状态或模式。备份时先停止服务，复制整个 `data` 目录；恢复时停止服务后替换该目录，再运行初始化命令。不要删除正在使用的数据库。

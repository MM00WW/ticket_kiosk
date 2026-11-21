-- 保留窗口及现场服务关联；旧 READY 状态转为空闲，移除自动分配字段。
CREATE TABLE "new_ServiceWindow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "currentTicketId" TEXT
);
INSERT INTO "new_ServiceWindow" ("id", "name", "status", "currentTicketId")
SELECT "id", "name", CASE WHEN "status" = 'READY' THEN 'IDLE' ELSE "status" END, "currentTicketId"
FROM "ServiceWindow";
DROP TABLE "ServiceWindow";
ALTER TABLE "new_ServiceWindow" RENAME TO "ServiceWindow";
CREATE UNIQUE INDEX "ServiceWindow_currentTicketId_key" ON "ServiceWindow"("currentTicketId");

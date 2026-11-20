-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "queueDate" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "windowId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ServiceWindow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "allocationMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "readyAt" DATETIME,
    "currentTicketId" TEXT
);

-- CreateTable
CREATE TABLE "QueueEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT,
    "windowId" INTEGER,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_queueDate_sequence_key" ON "Ticket"("queueDate", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWindow_currentTicketId_key" ON "ServiceWindow"("currentTicketId");

-- CreateIndex
CREATE INDEX "QueueEvent_createdAt_idx" ON "QueueEvent"("createdAt");

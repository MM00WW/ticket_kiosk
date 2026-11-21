-- 保留所有已有号码；历史记录不自动猜测需求。
ALTER TABLE "Ticket" ADD COLUMN "issues" JSONB NOT NULL DEFAULT '[]';

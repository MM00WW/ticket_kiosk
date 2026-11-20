import { db } from "../db";
import { publish } from "../socketServer";
import type { Tx } from "./eventService";
import { AppError } from "../errors";
export async function mutate<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const result = await db.$transaction(
        async (tx) => {
          // 首次写入取得 SQLite 写锁；跨连接并发也由数据库串行保护。
          await tx.$executeRawUnsafe(
            'UPDATE "SystemSetting" SET "value" = "value" WHERE "key" = \'speechLanguage\'',
          );
          const since = new Date();
          const before = await tx.queueEvent.findMany({
            where: { createdAt: { gte: since } },
            select: { id: true },
          });
          const value = await work(tx);
          const events = await tx.queueEvent.findMany({
            where: {
              createdAt: { gte: since },
              id: { notIn: before.map((e) => e.id) },
            },
            orderBy: { createdAt: "asc" },
          });
          return { value, events };
        },
        { timeout: 15000 },
      );
      publish(result.events); // 仅在提交后广播。
      return result.value;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = String(error);
      if (!/locked|busy|P2034|P2028|P2002/i.test(message)) throw error;
      if (attempt === 7)
        throw new AppError(
          503,
          "DATABASE_BUSY",
          "Database busy. Please retry.",
        );
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw new AppError(503, "DATABASE_BUSY", "Database busy. Please retry.");
}

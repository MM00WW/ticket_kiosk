import "dotenv/config";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
const url = process.env.DATABASE_URL ?? "file:./data/queue.db";
if (url.startsWith("file:"))
  mkdirSync(dirname(resolve(url.slice(5))), { recursive: true });
const globalDb = globalThis as unknown as { queueDb?: PrismaClient };
export const db =
  globalDb.queueDb ??
  new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
globalDb.queueDb = db;

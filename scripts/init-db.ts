import "dotenv/config";
import { mkdirSync, openSync, closeSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
const url = process.env.DATABASE_URL ?? "file:./data/queue.db";
mkdirSync(dirname(resolve(url.slice(5))), { recursive: true });
// 在 Windows 上预先创建文件，避免 schema-engine 无法创建新 SQLite 文件。
closeSync(openSync(resolve(url.slice(5)), "a"));
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit" },
);
await import("../prisma/seed");

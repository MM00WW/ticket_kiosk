import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  Ticket,
  ServiceWindow,
  QueueEvent,
  SystemSetting,
} from "../types/queue";

const path = resolve(
  (process.env.DATABASE_URL ?? "file:./data/queue.db").replace(/^file:/, ""),
);
mkdirSync(dirname(path), { recursive: true });
export const db = new Database(path);
db.pragma("journal_mode = WAL");

// 保留原表名和字段，旧数据库可以继续使用。
db.exec(`
 CREATE TABLE IF NOT EXISTS Ticket (
  id TEXT PRIMARY KEY, number TEXT NOT NULL, queueDate TEXT NOT NULL,
  sequence INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'WAITING',
  windowId INTEGER, createdAt DATETIME NOT NULL, calledAt DATETIME,
  startedAt DATETIME, completedAt DATETIME, issues TEXT NOT NULL DEFAULT '[]',
  UNIQUE(queueDate, sequence)
 );
 CREATE INDEX IF NOT EXISTS Ticket_status_createdAt_idx ON Ticket(status, createdAt);
 CREATE TABLE IF NOT EXISTS ServiceWindow (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OFFLINE',
  allocationMode TEXT NOT NULL DEFAULT 'MANUAL', readyAt DATETIME, currentTicketId TEXT UNIQUE
 );
 CREATE TABLE IF NOT EXISTS QueueEvent (
  id TEXT PRIMARY KEY, ticketId TEXT, windowId INTEGER, type TEXT NOT NULL,
  payload TEXT NOT NULL, createdAt DATETIME NOT NULL
 );
 CREATE INDEX IF NOT EXISTS QueueEvent_createdAt_idx ON QueueEvent(createdAt);
 CREATE TABLE IF NOT EXISTS SystemSetting (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt DATETIME NOT NULL
 );
`);
const columns = db.pragma("table_info(Ticket)") as { name: string }[];
if (!columns.some((column) => column.name === "issues"))
  db.exec("ALTER TABLE Ticket ADD COLUMN issues TEXT NOT NULL DEFAULT '[]'");
for (let id = 1; id <= 4; id++) {
  db.prepare("INSERT OR IGNORE INTO ServiceWindow(id, name) VALUES (?, ?)").run(
    id,
    `Window ${id}`,
  );
}
db.prepare(
  "INSERT OR IGNORE INTO SystemSetting(key, value, updatedAt) VALUES ('speechLanguage', 'en', ?)",
).run(Date.now());

// 兼容 Prisma 保存的毫秒时间；接口统一返回 ISO 字符串。
function date(value: string | number | null) {
  if (value === null) return null;
  return new Date(value).toISOString();
}
interface TicketRow extends Omit<
  Ticket,
  "issues" | "createdAt" | "calledAt" | "startedAt" | "completedAt"
> {
  issues: string;
  createdAt: string | number;
  calledAt: string | number | null;
  startedAt: string | number | null;
  completedAt: string | number | null;
}
export function ticketData(row: TicketRow): Ticket {
  return {
    ...row,
    issues: JSON.parse(row.issues),
    createdAt: date(row.createdAt)!,
    calledAt: date(row.calledAt),
    startedAt: date(row.startedAt),
    completedAt: date(row.completedAt),
  };
}
export function getTicket(id: string) {
  return ticketData(
    db.prepare("SELECT * FROM Ticket WHERE id = ?").get(id) as TicketRow,
  );
}
export function getTickets(day: string) {
  const rows = db
    .prepare("SELECT * FROM Ticket WHERE queueDate = ? ORDER BY sequence")
    .all(day) as TicketRow[];
  return rows.map(ticketData);
}
export function getWindows(): ServiceWindow[] {
  const rows = db
    .prepare("SELECT * FROM ServiceWindow ORDER BY id")
    .all() as ServiceWindow[];
  return rows.map((row) => ({ ...row, readyAt: date(row.readyAt) }));
}
export function getWindow(id: number) {
  return getWindows().find((window) => window.id === id);
}
export function getEvents(): QueueEvent[] {
  const rows = db
    .prepare(
      "SELECT * FROM QueueEvent ORDER BY createdAt DESC, rowid DESC LIMIT 100",
    )
    .all() as QueueEvent[];
  return rows.map((row) => ({ ...row, createdAt: date(row.createdAt)! }));
}
export function getSettings(): SystemSetting[] {
  const rows = db
    .prepare("SELECT * FROM SystemSetting")
    .all() as SystemSetting[];
  return rows.map((row) => ({ ...row, updatedAt: date(row.updatedAt)! }));
}

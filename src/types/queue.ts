import type { getSnapshot } from "../server/services/ticketService";
// API 日期使用 JSON 字符串传输，避免客户端误当作 Date 实例。
type JsonValue<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? JsonValue<U>[]
    : T extends object
      ? { [K in keyof T]: JsonValue<T[K]> }
      : T;
export type Snapshot = JsonValue<Awaited<ReturnType<typeof getSnapshot>>>;
export type Ticket = Snapshot["tickets"][number];
export type QueueEvent = Snapshot["events"][number];

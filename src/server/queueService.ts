import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  db,
  getTicket,
  getTickets,
  getWindow,
  getWindows,
  getEvents,
  getSettings,
} from "./db";
import { AppError } from "./api";
import { publish } from "./socketServer";
import { createTicketSchema } from "../lib/issueCatalog";
import type { QueueEvent, Snapshot, ServiceWindow } from "../types/queue";

export function queueDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.QUEUE_TIMEZONE ?? "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// 1. 查询。当天事当天结束，不处理隔夜队列。
export function getSnapshot(): Snapshot {
  return db.transaction(() => ({
    tickets: getTickets(queueDate()),
    windows: getWindows(),
    events: getEvents(),
    settings: getSettings(),
    date: queueDate(),
    serverTime: new Date().toISOString(),
  }))();
}

// 2. 每次操作收集自己的事件，数据库提交后统一广播。
function record(
  events: QueueEvent[],
  type: string,
  windowId: number | null = null,
  ticketId: string | null = null,
  payload: object = {},
) {
  const event: QueueEvent = {
    id: randomUUID(),
    type,
    windowId,
    ticketId,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO QueueEvent(id, type, windowId, ticketId, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    event.id,
    type,
    windowId,
    ticketId,
    event.payload,
    Date.parse(event.createdAt),
  );
  events.push(event);
}
function mutate<T>(work: (events: QueueEvent[]) => T): T {
  const events: QueueEvent[] = [];
  const result = db.transaction(() => work(events)).immediate();
  publish(events);
  return result;
}

// 3. 取号。事务内生成序号，然后检查是否有自动接单窗口。
export function createTicket(input: unknown = {}) {
  const { issues } = createTicketSchema.parse(input);
  return mutate((events) => {
    const day = queueDate();
    const last = db
      .prepare(
        "SELECT COALESCE(MAX(sequence), 0) AS sequence FROM Ticket WHERE queueDate = ?",
      )
      .get(day) as { sequence: number };
    const sequence = last.sequence + 1;
    const id = randomUUID();
    const number = `A${String(sequence).padStart(3, "0")}`;
    db.prepare(
      "INSERT INTO Ticket(id, number, queueDate, sequence, createdAt, issues) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(id, number, day, sequence, Date.now(), JSON.stringify(issues));
    record(events, "ticket:created", null, id, { number, issues });
    allocateReady(events);
    return getTicket(id);
  });
}

// 4. 手动和自动共用同一套分配规则。
function allocate(
  events: QueueEvent[],
  window: ServiceWindow,
  automatic: boolean,
) {
  const expected = automatic ? "READY" : "IDLE";
  if (
    window.status !== expected ||
    window.allocationMode !== (automatic ? "AUTO" : "MANUAL")
  )
    throw new AppError(
      409,
      "INVALID_STATE",
      "Window is not ready for this allocation mode.",
    );
  const ticket = db
    .prepare(
      "SELECT id, number FROM Ticket WHERE queueDate = ? AND status = 'WAITING' ORDER BY sequence LIMIT 1",
    )
    .get(queueDate()) as { id: string; number: string } | undefined;
  if (!ticket) return false;
  db.prepare(
    "UPDATE Ticket SET status = 'CALLED', windowId = ?, calledAt = ? WHERE id = ?",
  ).run(window.id, Date.now(), ticket.id);
  db.prepare(
    "UPDATE ServiceWindow SET status = 'CALLING', currentTicketId = ?, readyAt = NULL WHERE id = ?",
  ).run(ticket.id, window.id);
  record(events, "ticket:called", window.id, ticket.id, {
    number: ticket.number,
  });
  record(events, "window:updated", window.id);
  return true;
}
function allocateReady(events: QueueEvent[]) {
  const windows = db
    .prepare(
      "SELECT * FROM ServiceWindow WHERE status = 'READY' AND allocationMode = 'AUTO' ORDER BY readyAt, id",
    )
    .all() as ServiceWindow[];
  for (const window of windows) {
    if (!allocate(events, window, true)) break;
  }
}

export const actionSchema = z.enum([
  "online",
  "ready",
  "cancel-ready",
  "call-next",
  "recall",
  "start",
  "complete",
  "no-show",
  "mode",
  "pause",
  "resume",
  "offline",
]);
export type WindowAction = z.infer<typeof actionSchema>;

// 5. 窗口操作。保留常见业务状态判断，不增加补偿或重试框架。
export function windowAction(id: number, action: WindowAction, body: unknown) {
  return mutate((events) => {
    const window = getWindow(id);
    if (!window)
      throw new AppError(404, "WINDOW_NOT_FOUND", "Window not found.");
    if (action === "mode") {
      const { mode } = z
        .object({ mode: z.enum(["MANUAL", "AUTO"]) })
        .parse(body);
      db.prepare(
        "UPDATE ServiceWindow SET allocationMode = ? WHERE id = ?",
      ).run(mode, id);
      if (window.status === "READY" && mode === "MANUAL")
        db.prepare(
          "UPDATE ServiceWindow SET status = 'IDLE', readyAt = NULL WHERE id = ?",
        ).run(id);
    } else if (action === "call-next") {
      if (!allocate(events, window, false))
        throw new AppError(409, "QUEUE_EMPTY", "No tickets are waiting.");
    } else if (
      action === "start" ||
      action === "complete" ||
      action === "no-show" ||
      action === "recall"
    ) {
      const expected = action === "complete" ? "BUSY" : "CALLING";
      if (window.status !== expected || !window.currentTicketId)
        throw new AppError(
          409,
          "INVALID_STATE",
          `Action requires ${expected}.`,
        );
      const ticket = getTicket(window.currentTicketId);
      if (action === "start") {
        db.prepare(
          "UPDATE Ticket SET status = 'SERVING', startedAt = ? WHERE id = ?",
        ).run(Date.now(), ticket.id);
        db.prepare("UPDATE ServiceWindow SET status = 'BUSY' WHERE id = ?").run(
          id,
        );
      } else if (action === "complete" || action === "no-show") {
        db.prepare(
          "UPDATE Ticket SET status = ?, completedAt = ? WHERE id = ?",
        ).run(
          action === "complete" ? "COMPLETED" : "NO_SHOW",
          Date.now(),
          ticket.id,
        );
        db.prepare(
          "UPDATE ServiceWindow SET status = 'IDLE', currentTicketId = NULL, readyAt = NULL WHERE id = ?",
        ).run(id);
      }
      const eventTypes = {
        start: "ticket:started",
        complete: "ticket:completed",
        "no-show": "ticket:no-show",
        recall: "ticket:recalled",
      };
      record(events, eventTypes[action], id, ticket.id, {
        number: ticket.number,
      });
    } else {
      const transitions = {
        online: ["OFFLINE", "IDLE"],
        ready: ["IDLE", "READY"],
        "cancel-ready": ["READY", "IDLE"],
        pause: ["IDLE", "PAUSED"],
        resume: ["PAUSED", "IDLE"],
        offline: ["IDLE", "OFFLINE"],
      };
      const [from, to] = transitions[action];
      if (
        window.status !== from ||
        (action === "ready" && window.allocationMode !== "AUTO")
      )
        throw new AppError(
          409,
          "INVALID_STATE",
          `Cannot ${action} from ${window.status}.`,
        );
      db.prepare(
        "UPDATE ServiceWindow SET status = ?, readyAt = ? WHERE id = ?",
      ).run(to, to === "READY" ? Date.now() : null, id);
      if (to === "READY") allocateReady(events);
    }
    record(events, "window:updated", id, null, { action });
    return getWindow(id)!;
  });
}

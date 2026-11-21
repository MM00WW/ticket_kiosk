import { z } from "zod";
import type {
  Prisma,
  QueueEvent,
  ServiceWindow,
} from "../generated/prisma/client";
import { db } from "./db";
import { AppError } from "./api";
import { publish } from "./socketServer";
import { createTicketSchema, withTypedIssues } from "../lib/issueCatalog";

type Tx = Prisma.TransactionClient & { events: QueueEvent[] };

// 1. 取号与队列查询
export function queueDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.QUEUE_TIMEZONE ?? "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function createTicket(input: unknown = {}) {
  const { issues } = createTicketSchema.parse(input);
  return mutate(async (tx) => {
    const date = queueDate();
    const last = await tx.ticket.aggregate({
      where: { queueDate: date },
      _max: { sequence: true },
    });
    const sequence = (last._max.sequence ?? 0) + 1;
    const ticket = await tx.ticket.create({
      data: {
        number: `A${String(sequence).padStart(3, "0")}`,
        sequence,
        queueDate: date,
        issues,
      },
    });
    await record(tx, "ticket:created", undefined, ticket.id, {
      number: ticket.number,
      issues,
    });
    return withTypedIssues(
      await tx.ticket.findUniqueOrThrow({ where: { id: ticket.id } }),
    );
  });
}
export async function getSnapshot() {
  // 单个读事务确保计数、队列与窗口来自同一数据库快照。
  return db.$transaction(async (tx) => {
    const tickets = await tx.ticket.findMany({
      where: {
        OR: [
          { queueDate: queueDate() },
          { status: { in: ["WAITING", "CALLED", "SERVING"] } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { sequence: "asc" }],
    });
    const windows = await tx.serviceWindow.findMany({ orderBy: { id: "asc" } });
    const events = await tx.queueEvent.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    return {
      tickets: tickets.map(withTypedIssues),
      windows,
      events,
      date: queueDate(),
    };
  });
}

// 2. 按先来先服务分配号码
async function allocate(tx: Tx, windowId: number) {
  const window = await tx.serviceWindow.findUniqueOrThrow({
    where: { id: windowId },
  });
  if (window.status !== "IDLE" || window.currentTicketId)
    throw new AppError(
      409,
      "INVALID_STATE",
      "Window cannot accept a ticket in its current state.",
    );
  const ticket = await tx.ticket.findFirst({
    where: { status: "WAITING" },
    orderBy: [{ createdAt: "asc" }, { sequence: "asc" }],
  });
  if (!ticket) return null;
  const changed = await tx.ticket.updateMany({
    where: { id: ticket.id, status: "WAITING" },
    data: { status: "CALLED", windowId, calledAt: new Date() },
  });
  if (changed.count !== 1)
    throw new AppError(409, "ALREADY_ALLOCATED", "Ticket already allocated.");
  const claimed = await tx.serviceWindow.updateMany({
    where: { id: windowId, status: "IDLE", currentTicketId: null },
    data: { status: "CALLING", currentTicketId: ticket.id },
  });
  if (claimed.count !== 1)
    throw new AppError(409, "WINDOW_CHANGED", "Window state changed. Retry.");
  await record(tx, "ticket:called", windowId, ticket.id, {
    number: ticket.number,
  });
  await record(tx, "window:updated", windowId);
  return ticket;
}
// 3. 窗口操作
export const actionSchema = z.enum([
  "online",
  "online-work",
  "finish-online-work",
  "call-next",
  "recall",
  "start",
  "complete",
  "no-show",
  "pause",
  "resume",
  "offline",
]);
export type WindowAction = z.infer<typeof actionSchema>;
export function windowAction(id: number, action: WindowAction) {
  return mutate(async (tx) => {
    const window = await tx.serviceWindow.findUnique({ where: { id } });
    if (!window)
      throw new AppError(404, "WINDOW_NOT_FOUND", "Window not found.");
    if (action === "online-work" || action === "finish-online-work") {
      const allowed =
        action === "online-work"
          ? window.status === "IDLE" && !window.currentTicketId
          : window.status === "ONLINE_WORK" && !window.currentTicketId;
      if (!allowed)
        throw new AppError(
          409,
          "INVALID_STATE",
          "Cannot change online work from the current window state.",
        );
      await tx.serviceWindow.update({
        where: { id },
        data: {
          status: action === "online-work" ? "ONLINE_WORK" : "IDLE",
        },
      });
    } else if (
      action === "start" ||
      action === "complete" ||
      action === "no-show" ||
      action === "recall"
    ) {
      await serviceSession(tx, window, action);
    } else if (action === "call-next") {
      if (!(await allocate(tx, id)))
        throw new AppError(409, "QUEUE_EMPTY", "No tickets are waiting.");
    } else {
      const transitions = {
        online: ["OFFLINE", "IDLE"],
        pause: ["IDLE", "PAUSED"],
        resume: ["PAUSED", "IDLE"],
        offline: ["IDLE", "OFFLINE"],
      } as const;
      const [from, to] = transitions[action];
      if (window.status !== from)
        throw new AppError(
          409,
          "INVALID_STATE",
          `Cannot ${action} from ${window.status}.`,
        );
      await tx.serviceWindow.update({
        where: { id },
        data: { status: to },
      });
    }
    await record(tx, "window:updated", id, undefined, { action });
    return tx.serviceWindow.findUniqueOrThrow({ where: { id } });
  });
}

// 4. 开始、完成、未到和重复叫号
async function serviceSession(
  tx: Tx,
  window: ServiceWindow,
  action: "start" | "complete" | "no-show" | "recall",
) {
  const expected = action === "complete" ? "BUSY" : "CALLING";
  if (window.status !== expected || !window.currentTicketId)
    throw new AppError(409, "INVALID_STATE", `Action requires ${expected}.`);
  const ticket = await tx.ticket.findUniqueOrThrow({
    where: { id: window.currentTicketId },
  });
  if (ticket.status !== (action === "complete" ? "SERVING" : "CALLED"))
    throw new AppError(409, "INVALID_TICKET", "Ticket state is inconsistent.");
  if (action !== "recall") {
    let ticketData: Prisma.TicketUpdateInput;
    let windowData: Prisma.ServiceWindowUpdateInput;
    if (action === "start") {
      ticketData = { status: "SERVING", startedAt: new Date() };
      windowData = { status: "BUSY" };
    } else {
      ticketData = {
        status: action === "complete" ? "COMPLETED" : "NO_SHOW",
        completedAt: new Date(),
      };
      windowData = { status: "IDLE", currentTicketId: null };
    }
    await tx.ticket.update({ where: { id: ticket.id }, data: ticketData });
    await tx.serviceWindow.update({
      where: { id: window.id },
      data: windowData,
    });
  }
  const type = {
    start: "ticket:started",
    complete: "ticket:completed",
    "no-show": "ticket:no-show",
    recall: "ticket:recalled",
  }[action];
  await record(tx, type, window.id, ticket.id, { number: ticket.number });
}

// 5. 写事务与提交后通知
async function mutate<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const result = await db.$transaction(
        async (tx) => {
          // 首次写入取得 SQLite 写锁；跨连接并发也由数据库串行保护。
          await tx.$executeRawUnsafe(
            'UPDATE "SystemSetting" SET "value" = "value" WHERE "key" = \'speechLanguage\'',
          );
          // 每次尝试独立收集事件；回滚时丢弃，只广播已提交的事件。
          const context: Tx = Object.assign(tx, { events: [] as QueueEvent[] });
          const value = await work(context);
          return { value, events: context.events };
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

// 6. 保存操作记录

async function record(
  tx: Tx,
  type: string,
  windowId?: number,
  ticketId?: string,
  payload: Record<string, unknown> = {},
) {
  const event = await tx.queueEvent.create({
    data: { type, windowId, ticketId, payload: JSON.stringify(payload) },
  });
  tx.events.push(event);
  return event;
}

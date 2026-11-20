import { db } from "../db";
import { mutate } from "./transaction";
import { record } from "./eventService";
import { allocateReady } from "./allocationService";
import { createTicketSchema, withTypedIssues } from "../../lib/issueCatalog";
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
    await allocateReady(tx);
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
    const settings = await tx.systemSetting.findMany();
    return {
      tickets: tickets.map(withTypedIssues),
      windows,
      events,
      settings,
      date: queueDate(),
      serverTime: new Date().toISOString(),
    };
  });
}

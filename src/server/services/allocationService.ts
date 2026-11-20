import { AppError } from "../errors";
import { record, type Tx } from "./eventService";
export async function allocate(tx: Tx, windowId: number, automatic: boolean) {
  const window = await tx.serviceWindow.findUniqueOrThrow({
    where: { id: windowId },
  });
  const expected = automatic ? "READY" : "IDLE";
  if (
    window.status !== expected ||
    window.currentTicketId ||
    window.allocationMode !== (automatic ? "AUTO" : "MANUAL")
  )
    throw new AppError(
      409,
      "INVALID_STATE",
      "Window cannot accept a ticket in its current state or mode.",
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
    where: { id: windowId, status: expected, currentTicketId: null },
    data: { status: "CALLING", currentTicketId: ticket.id, readyAt: null },
  });
  if (claimed.count !== 1)
    throw new AppError(409, "WINDOW_CHANGED", "Window state changed. Retry.");
  await record(tx, "ticket:called", windowId, ticket.id, {
    number: ticket.number,
  });
  await record(tx, "window:updated", windowId);
  return ticket;
}
export async function allocateReady(tx: Tx) {
  const windows = await tx.serviceWindow.findMany({
    where: { status: "READY", allocationMode: "AUTO" },
    orderBy: [{ readyAt: "asc" }, { id: "asc" }],
  });
  for (const window of windows)
    if (!(await allocate(tx, window.id, true))) break;
}

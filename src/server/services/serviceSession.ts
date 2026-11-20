import { AppError } from "../errors";
import { record, type Tx } from "./eventService";
import type { ServiceWindow } from "../../generated/prisma/client";
export async function serviceSession(
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
    await tx.ticket.update({
      where: { id: ticket.id },
      data:
        action === "start"
          ? { status: "SERVING", startedAt: new Date() }
          : {
              status: action === "complete" ? "COMPLETED" : "NO_SHOW",
              completedAt: new Date(),
            },
    });
    await tx.serviceWindow.update({
      where: { id: window.id },
      data:
        action === "start"
          ? { status: "BUSY" }
          : { status: "IDLE", currentTicketId: null, readyAt: null },
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

import type { Prisma } from "../../generated/prisma/client";
export type Tx = Prisma.TransactionClient;
export async function record(
  tx: Tx,
  type: string,
  windowId?: number,
  ticketId?: string,
  payload: Record<string, unknown> = {},
) {
  return tx.queueEvent.create({
    data: { type, windowId, ticketId, payload: JSON.stringify(payload) },
  });
}

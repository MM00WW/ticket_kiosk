import type { Server } from "socket.io";
import type { QueueEvent } from "../generated/prisma/client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/queue";
export type QueueSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents
>;
const shared = globalThis as unknown as { queueIo?: QueueSocketServer };
export function setSocketServer(io: QueueSocketServer) {
  shared.queueIo = io;
}
export function publish(events: QueueEvent[]) {
  for (const event of events) {
    const name = event.type as Exclude<
      keyof ServerToClientEvents,
      "queue:updated"
    >;
    shared.queueIo?.emit(name, {
      ...event,
      createdAt: event.createdAt.toISOString(),
    });
  }
  shared.queueIo?.emit("queue:updated", { id: crypto.randomUUID() });
}

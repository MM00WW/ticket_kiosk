import type { Server } from "socket.io";
import type { QueueEvent } from "../types/queue";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/queue";
export type QueueSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents
>;
let socketServer: QueueSocketServer | undefined;
export function setSocketServer(io: QueueSocketServer) {
  socketServer = io;
}
export function publish(events: QueueEvent[]) {
  for (const event of events) {
    const name = event.type as Exclude<
      keyof ServerToClientEvents,
      "queue:updated"
    >;
    socketServer?.emit(name, {
      ...event,
      createdAt: event.createdAt,
    });
  }
  socketServer?.emit("queue:updated", { id: crypto.randomUUID() });
}

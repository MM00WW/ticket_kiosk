import type { QueueEvent } from "./queue";
export interface ServerToClientEvents {
  "queue:updated": (event: { id: string }) => void;
  "ticket:created": (event: QueueEvent) => void;
  "ticket:called": (event: QueueEvent) => void;
  "ticket:recalled": (event: QueueEvent) => void;
  "ticket:completed": (event: QueueEvent) => void;
  "ticket:started": (event: QueueEvent) => void;
  "ticket:no-show": (event: QueueEvent) => void;
  "window:updated": (event: QueueEvent) => void;
}
export type ClientToServerEvents = Record<string, never>;

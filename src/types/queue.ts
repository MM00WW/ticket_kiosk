import type { IssueSelection } from "../lib/issueCatalog";

// API 的日期字段通过 JSON 传输，使用字符串。
export interface Ticket {
  id: string;
  number: string;
  queueDate: string;
  sequence: number;
  status: "WAITING" | "CALLED" | "SERVING" | "COMPLETED" | "NO_SHOW";
  windowId: number | null;
  createdAt: string;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  issues: IssueSelection[];
}
export interface ServiceWindow {
  id: number;
  name: string;
  status: "OFFLINE" | "IDLE" | "READY" | "CALLING" | "BUSY" | "PAUSED";
  allocationMode: "MANUAL" | "AUTO";
  readyAt: string | null;
  currentTicketId: string | null;
}
export interface QueueEvent {
  id: string;
  ticketId: string | null;
  windowId: number | null;
  type: string;
  payload: string;
  createdAt: string;
}
export interface SystemSetting {
  key: string;
  value: string;
  updatedAt: string;
}
export interface Snapshot {
  tickets: Ticket[];
  windows: ServiceWindow[];
  events: QueueEvent[];
  settings: SystemSetting[];
  date: string;
  serverTime: string;
}

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

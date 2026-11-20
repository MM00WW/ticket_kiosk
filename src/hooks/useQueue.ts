"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Snapshot, QueueEvent } from "@/types/queue";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types/realtime";
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "Request failed");
  return result.data as T;
}
export function useQueue(onAnnouncement?: (event: QueueEvent) => void) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const callback = useRef(onAnnouncement);
  const revision = useRef(0);
  useEffect(() => {
    callback.current = onAnnouncement;
  }, [onAnnouncement]);
  const refresh = useCallback(async () => {
    const version = ++revision.current;
    try {
      const snapshot = await request<Snapshot>("/api/queue");
      if (version === revision.current) {
        setData(snapshot);
        setError("");
      }
    } catch (e) {
      if (version === revision.current) setError(String(e));
    }
  }, []);
  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      reconnection: true,
    });
    const seen = new Set<string>();
    const announce = (event: QueueEvent) => {
      if (seen.has(event.id)) return;
      seen.add(event.id);
      if (seen.size > 1000) seen.delete(seen.values().next().value!);
      callback.current?.(event);
    };
    socket.on("connect", () => {
      setConnected(true);
      void refresh();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("queue:updated", () => void refresh());
    socket.on("ticket:called", announce);
    socket.on("ticket:recalled", announce);
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      socket.disconnect();
    };
  }, [refresh]);
  return { data, connected, error, refresh };
}

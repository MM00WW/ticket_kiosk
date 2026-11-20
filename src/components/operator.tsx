"use client";
import type { Snapshot } from "@/types/queue";
import { messages, type Language } from "@/i18n";
import Link from "next/link";
import { BellRing, Check, Monitor, Users, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { request } from "@/hooks/useQueue";
import type { WindowAction } from "@/server/queueService";
import { TicketList } from "@/components/shared/ticket-list";
import { elapsed, time, Status } from "@/components/shared/queue-format";
import { IssueBadges } from "@/components/shared/issue-badges";
import { issueMessages } from "@/i18n/issues";
const actions: {
  action: WindowAction;
  label: string;
  states: string[];
  mode?: string;
}[] = [
  { action: "online", label: "Go online", states: ["OFFLINE"] },
  {
    action: "ready",
    label: "Ready to receive",
    states: ["IDLE"],
    mode: "AUTO",
  },
  { action: "cancel-ready", label: "Cancel ready", states: ["READY"] },
  {
    action: "call-next",
    label: "Call next ticket",
    states: ["IDLE"],
    mode: "MANUAL",
  },
  { action: "recall", label: "Call again", states: ["CALLING"] },
  { action: "start", label: "Start service", states: ["CALLING"] },
  { action: "complete", label: "Complete service", states: ["BUSY"] },
  { action: "no-show", label: "Mark no-show", states: ["CALLING"] },
  { action: "pause", label: "Pause service", states: ["IDLE"] },
  { action: "resume", label: "Resume service", states: ["PAUSED"] },
  { action: "offline", label: "Go offline", states: ["IDLE"] },
];

export function OperatorView({
  data,
  language,
  windowId,
  now,
  busy,
  run,
}: {
  data: Snapshot;
  language: Language;
  windowId: number;
  now: number;
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const t = messages[language];
  const waiting = data.tickets.filter((t) => t.status === "WAITING");
  const today = data.tickets.filter((t) => t.queueDate === data.date);
  const currentWindow = data.windows.find((w) => w.id === windowId);
  const current = data.tickets.find(
    (t) => t.id === currentWindow?.currentTicketId,
  );
  if (!currentWindow) return null;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold">Your service workspace</h1>
          <p className="muted mt-2">
            Manage your window. Keep the queue moving.
          </p>
        </div>
        <div className="flex gap-2">
          {data.windows.map((w) => (
            <Link
              key={w.id}
              className={`nav-link ${windowId === w.id ? "active" : ""}`}
              href={`/operator/${w.id}`}
            >
              Window {w.id}
            </Link>
          ))}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[
          { label: "Your window", value: `0${windowId}`, icon: Monitor },
          {
            label: "Waiting in queue",
            value: waiting.length,
            icon: Users,
          },
          {
            label: "Completed today",
            value: today.filter(
              (t) => t.windowId === windowId && t.status === "COMPLETED",
            ).length,
            icon: Check,
          },
          {
            label: "Allocation mode",
            value: currentWindow.allocationMode,
            icon: LayoutDashboard,
          },
        ].map((item) => (
          <div
            className="panel flex items-center justify-between"
            key={item.label}
          >
            <div>
              <p className="muted text-xs">{item.label}</p>
              <p className="mt-3 text-2xl font-bold">{item.value}</p>
            </div>
            <item.icon className="text-blue-500" size={22} />
          </div>
        ))}
      </div>
      <div className="grid-main">
        <div className="space-y-6">
          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Current service</h2>
              <Status status={currentWindow.status} />
            </div>
            <div className="py-12 text-center">
              <p className="eyebrow">
                {current ? "CURRENT TICKET" : "READY WHEN YOU ARE"}
              </p>
              <div className="number my-5 text-8xl font-bold">
                {current?.number ?? "—"}
              </div>
              <p className="muted text-sm">
                {current
                  ? `Issued ${time(current.createdAt)} · ${current.queueDate}`
                  : "Go online and call your next visitor."}
              </p>
              {current && (
                <div className="mx-auto mt-6 max-w-2xl text-left">
                  <p className="muted mb-3 text-xs font-semibold">
                    {issueMessages[language].requests}
                  </p>
                  <IssueBadges issues={current.issues} language={language} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 border-t border-[var(--border)] pt-6 text-center">
              <div>
                <p className="muted text-xs">Ticket wait time</p>
                <p className="mt-2 text-xl font-semibold">
                  {current
                    ? elapsed(
                        current.createdAt,
                        current.calledAt ? Date.parse(current.calledAt) : now,
                      )
                    : "—"}
                </p>
              </div>
              <div>
                <p className="muted text-xs">Service duration</p>
                <p className="mt-2 text-xl font-semibold">
                  {elapsed(current?.startedAt, now)}
                </p>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Window controls</h2>
              <select
                aria-label="Allocation mode"
                value={currentWindow.allocationMode}
                disabled={busy}
                onChange={(e) =>
                  void run(() =>
                    request(`/api/windows/${windowId}/mode`, {
                      mode: e.target.value,
                    }),
                  )
                }
              >
                <option value="MANUAL">Manual allocation</option>
                <option value="AUTO">Automatic allocation</option>
              </select>
            </div>
            <div className="action-grid">
              {actions.map((a) => (
                <Button
                  key={a.action}
                  variant={
                    [
                      "call-next",
                      "ready",
                      "start",
                      "complete",
                      "online",
                    ].includes(a.action)
                      ? "default"
                      : "outline"
                  }
                  disabled={
                    busy ||
                    !a.states.includes(currentWindow.status) ||
                    !!(a.mode && a.mode !== currentWindow.allocationMode)
                  }
                  onClick={() =>
                    void run(() =>
                      request(`/api/windows/${windowId}/${a.action}`, {}),
                    )
                  }
                >
                  {a.action === "recall" && <BellRing size={15} />} {a.label}
                </Button>
              ))}
            </div>
            <p className="muted mt-5 text-xs">
              Automatic mode requires “Ready to receive” for each new visitor.
            </p>
          </section>
        </div>
        <aside className="panel">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold">{t.queue}</h2>
            <span className="pill">{waiting.length} waiting</span>
          </div>
          <TicketList tickets={waiting} now={now} language={language} />
          <div className="mt-8 border-t border-[var(--border)] pt-6">
            <p className="eyebrow mb-4">TEAM AVAILABILITY</p>
            {data.windows.map((w) => (
              <div
                className="flex items-center justify-between py-3"
                key={w.id}
              >
                <span className="text-sm">Window {w.id}</span>
                <Status status={w.status} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

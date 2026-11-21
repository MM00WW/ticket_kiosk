import type { Snapshot } from "@/types/queue";
import { messages, type Language } from "@/i18n";
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
      <div className="operator-heading">
        <div>
          <h1 className="page-title">Your service workspace</h1>
          <p className="operator-intro">
            Manage your window. Keep the queue moving.
          </p>
        </div>
        <div className="window-tabs">
          {data.windows.map((w) => (
            <a
              key={w.id}
              className={`nav-link ${windowId === w.id ? "active" : ""}`}
              href={`/operator/${w.id}`}
            >
              Window {w.id}
            </a>
          ))}
        </div>
      </div>
      <div className="stats-grid">
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
          <div className="panel stat-card" key={item.label}>
            <div>
              <p className="caption">{item.label}</p>
              <p className="operator-stat">{item.value}</p>
            </div>
            <item.icon className="accent" size={22} />
          </div>
        ))}
      </div>
      <div className="grid-main">
        <div className="service-panels">
          <section className="panel">
            <div className="row-between">
              <h2 className="semibold">Current service</h2>
              <Status status={currentWindow.status} />
            </div>
            <div className="current-service">
              <p className="eyebrow">
                {current ? "CURRENT TICKET" : "READY WHEN YOU ARE"}
              </p>
              <div className="number current-number">
                {current?.number ?? "—"}
              </div>
              <p className="small-note">
                {current
                  ? `Issued ${time(current.createdAt)} · ${current.queueDate}`
                  : "Go online and call your next visitor."}
              </p>
              {current && (
                <div className="current-requests">
                  <p className="requests-caption">
                    {issueMessages[language].requests}
                  </p>
                  <IssueBadges issues={current.issues} language={language} />
                </div>
              )}
            </div>
            <div className="service-times">
              <div>
                <p className="caption">Ticket wait time</p>
                <p className="time-value">
                  {current
                    ? elapsed(
                        current.createdAt,
                        current.calledAt ? Date.parse(current.calledAt) : now,
                      )
                    : "—"}
                </p>
              </div>
              <div>
                <p className="caption">Service duration</p>
                <p className="time-value">{elapsed(current?.startedAt, now)}</p>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="controls-heading">
              <h2 className="semibold">Window controls</h2>
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
            <p className="controls-hint">
              Automatic mode requires “Ready to receive” for each new visitor.
            </p>
          </section>
        </div>
        <aside className="panel">
          <div className="queue-heading">
            <h2 className="semibold">{t.queue}</h2>
            <span className="pill">{waiting.length} waiting</span>
          </div>
          <TicketList tickets={waiting} now={now} language={language} />
          <div className="other-windows">
            <p className="eyebrow windows-label">TEAM AVAILABILITY</p>
            {data.windows.map((w) => (
              <div className="other-window" key={w.id}>
                <span className="small-text">Window {w.id}</span>
                <Status status={w.status} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

import type { Snapshot } from "@/types/queue";
import { type Language } from "@/i18n";
import { Monitor } from "lucide-react";
import { time, Status } from "@/components/shared/queue-format";
import { IssueBadges } from "@/components/shared/issue-badges";
import { issueMessages } from "@/i18n/issues";

export function AdminView({
  data,
  language,
}: {
  data: Snapshot;
  language: Language;
}) {
  const waiting = data.tickets.filter((t) => t.status === "WAITING");
  const today = data.tickets.filter((t) => t.queueDate === data.date);
  return (
    <>
      <h1 className="page-title">Service desk overview</h1>
      <p className="page-subtitle">
        {data.date} · Live operations and today’s activity
      </p>
      <div className="stats-grid">
        {[
          ["Tickets today", today.length],
          [
            "Completed today",
            today.filter((t) => t.status === "COMPLETED").length,
          ],
          ["Waiting", waiting.length],
          [
            "No-shows today",
            today.filter((t) => t.status === "NO_SHOW").length,
          ],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <p className="small-note">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>
      <div className="stats-grid">
        {data.windows.map((w) => (
          <a href={`/operator/${w.id}`} className="panel" key={w.id}>
            <div className="window-heading">
              <strong>{w.name}</strong>
              <Monitor size={18} />
            </div>
            <Status status={w.status} />
            <p className="window-number">
              {data.tickets.find((t) => t.id === w.currentTicketId)?.number ??
                "—"}
            </p>
            <p className="window-caption">{w.allocationMode}</p>
          </a>
        ))}
      </div>
      <div className="grid-main">
        <section className="panel table-panel">
          <h2 className="section-title">Tickets · today</h2>
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>{issueMessages[language].requests}</th>
                <th>Date</th>
                <th>Status</th>
                <th>Window</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map((t) => (
                <tr key={t.id}>
                  <td className="bold">{t.number}</td>
                  <td className="issue-cell">
                    <IssueBadges issues={t.issues} language={language} />
                  </td>
                  <td>{t.queueDate}</td>
                  <td>{t.status}</td>
                  <td>{t.windowId ?? "—"}</td>
                  <td>{time(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.tickets.length && (
            <p className="empty-message">No tickets yet today.</p>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title">
            Activity log <span className="caption">Latest 100</span>
          </h2>
          <div className="event-list">
            {data.events.map((e) => (
              <div className="list-row" key={e.id}>
                <p className="event-title">
                  {e.type} {e.windowId ? `· Window ${e.windowId}` : ""}
                </p>
                <p className="event-detail">
                  {time(e.createdAt)} · {e.payload}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

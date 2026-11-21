"use client";
import type { Snapshot } from "@/types/queue";
import { type Language } from "@/i18n";
import Link from "next/link";
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
      <h1 className="text-3xl font-bold">Service desk overview</h1>
      <p className="muted mb-8 mt-2">
        {data.date} · Live operations and today’s activity
      </p>
      <div className="mb-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
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
            <p className="muted text-sm">{label}</p>
            <p className="mt-3 text-4xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {data.windows.map((w) => (
          <Link href={`/operator/${w.id}`} className="panel" key={w.id}>
            <div className="mb-4 flex justify-between">
              <strong>{w.name}</strong>
              <Monitor size={18} />
            </div>
            <Status status={w.status} />
            <p className="mt-5 text-3xl font-bold">
              {data.tickets.find((t) => t.id === w.currentTicketId)?.number ??
                "—"}
            </p>
            <p className="muted mt-2 text-xs">{w.allocationMode}</p>
          </Link>
        ))}
      </div>
      <div className="grid-main">
        <section className="panel overflow-x-auto">
          <h2 className="mb-5 font-semibold">
            Tickets · today & active carryovers
          </h2>
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
                  <td className="font-bold">{t.number}</td>
                  <td className="min-w-64">
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
            <p className="muted py-5">No tickets yet today.</p>
          )}
        </section>
        <section className="panel">
          <h2 className="mb-5 font-semibold">
            Activity log <span className="muted text-xs">Latest 100</span>
          </h2>
          <div className="max-h-[650px] overflow-y-auto">
            {data.events.map((e) => (
              <div className="border-b border-[var(--border)] py-4" key={e.id}>
                <p className="text-sm font-medium">
                  {e.type} {e.windowId ? `· Window ${e.windowId}` : ""}
                </p>
                <p className="muted mt-2 break-all text-xs">
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

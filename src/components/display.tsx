"use client";
import type { Snapshot } from "@/types/queue";
import { messages, type Language } from "@/i18n";
import { Volume2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { time, Status } from "@/components/shared/queue-format";

export function DisplayView({
  data,
  language,
  voice,
  enableVoice,
  setNotice,
}: {
  data: Snapshot;
  language: Language;
  voice: boolean;
  enableVoice: () => void;
  setNotice: (value: string) => void;
}) {
  const t = messages[language];
  const waiting = data.tickets.filter((t) => t.status === "WAITING");
  const calls = data.events.filter(
    (e) => e.type === "ticket:called" || e.type === "ticket:recalled",
  );
  const latest = calls[0];
  const latestNumber = latest
    ? String((JSON.parse(latest.payload) as { number: string }).number)
    : "—";
  return (
    <>
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <h1 className="text-3xl font-bold">IT Service Desk</h1>
        <div className="flex gap-3">
          <Button variant="outline" disabled={voice} onClick={enableVoice}>
            <Volume2 size={17} />
            {voice ? "Voice enabled" : t.enable}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void document.documentElement
                .requestFullscreen()
                .catch(() => setNotice("Fullscreen is unavailable."))
            }
          >
            <Maximize2 size={17} />
            {t.fullscreen}
          </Button>
        </div>
      </div>
      <section className="rounded-3xl bg-blue-600 px-10 py-14 text-center text-white">
        <p className="text-lg uppercase tracking-[.25em] text-blue-100">
          {t.latest}
        </p>
        <div className="number my-5 text-[clamp(100px,14vw,200px)] font-bold">
          {latestNumber}
        </div>
        <p className="text-4xl font-medium">
          {latest
            ? `${t.window} ${latest.windowId}`
            : "Welcome · Please take a ticket"}
        </p>
      </section>
      <div className="my-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {data.windows.map((w) => (
          <div className="panel text-center" key={w.id}>
            <p className="muted text-sm">
              {t.window} {w.id}
            </p>
            <p className="my-5 text-5xl font-bold">
              {data.tickets.find((t) => t.id === w.currentTicketId)?.number ??
                "—"}
            </p>
            <Status status={w.status} />
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="mb-5 flex justify-between">
          <h2 className="font-semibold">{t.recent}</h2>
          <span className="muted">
            {waiting.length} {t.waiting.toLowerCase()}
          </span>
        </div>
        <div className="flex flex-wrap gap-4">
          {calls.slice(0, 6).map((e) => (
            <div key={e.id} className="rounded-xl bg-[var(--soft)] px-5 py-4">
              <strong className="mr-4 text-2xl">
                {String((JSON.parse(e.payload) as { number: string }).number)}
              </strong>
              <span className="muted">
                → {t.window} {e.windowId} · {time(e.createdAt)}
              </span>
            </div>
          ))}
          {calls.length === 0 && (
            <p className="muted">Announcements will appear here.</p>
          )}
        </div>
      </section>
    </>
  );
}

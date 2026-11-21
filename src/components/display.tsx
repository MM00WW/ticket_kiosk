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
      <div className="display-toolbar">
        <h1 className="page-title">IT Service Desk</h1>
        <div className="toolbar-actions">
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
      <section className="call-banner">
        <p className="call-label">{t.latest}</p>
        <div className="number display-number">{latestNumber}</div>
        <p className="call-window">
          {latest
            ? `${t.window} ${latest.windowId}`
            : "Welcome · Please take a ticket"}
        </p>
      </section>
      <div className="window-grid">
        {data.windows.map((w) => (
          <div className="panel window-card" key={w.id}>
            <p className="small-note">
              {t.window} {w.id}
            </p>
            <p className="window-ticket">
              {data.tickets.find((t) => t.id === w.currentTicketId)?.number ??
                "—"}
            </p>
            <Status status={w.status} />
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="recent-heading">
          <h2 className="semibold">{t.recent}</h2>
          <span className="muted">
            {waiting.length} {t.waiting.toLowerCase()}
          </span>
        </div>
        <div className="recent-calls">
          {calls.slice(0, 6).map((e) => (
            <div key={e.id} className="recent-call">
              <strong className="recent-number">
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

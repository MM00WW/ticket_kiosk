import { Check, Clock3 } from "lucide-react";
import type { Ticket } from "@/types/queue";
import type { Language } from "@/i18n";
import { IssueBadges } from "./issue-badges";
import { elapsed } from "./queue-format";
export function TicketList({
  tickets,
  now,
  language,
}: {
  tickets: Ticket[];
  now: number;
  language: Language;
}) {
  return tickets.length ? (
    <div>
      {tickets.slice(0, 20).map((t, i) => (
        <div className="list-row" key={t.id}>
          <div className="queue-row">
            <div className="queue-ticket">
              <span className="caption">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="queue-number">{t.number}</p>
                <p className="queue-date">{t.queueDate}</p>
              </div>
            </div>
            <span className="queue-wait">
              <Clock3 size={13} />
              {elapsed(t.createdAt, now)}
            </span>
          </div>
          <div className="queue-issues">
            <IssueBadges issues={t.issues} language={language} />
          </div>
        </div>
      ))}
      {tickets.length > 20 && (
        <p className="queue-more">+ {tickets.length - 20} more waiting</p>
      )}
    </div>
  ) : (
    <div className="current-service">
      <Check className="queue-empty-icon" />
      <p className="small-note">No visitors waiting</p>
    </div>
  );
}

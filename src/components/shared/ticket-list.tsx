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
        <div className="border-b border-[var(--border)] py-4" key={t.id}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="muted text-xs">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-xl font-bold">{t.number}</p>
                <p className="muted mt-1 text-xs">{t.queueDate}</p>
              </div>
            </div>
            <span className="muted flex items-center gap-2 text-xs">
              <Clock3 size={13} />
              {elapsed(t.createdAt, now)}
            </span>
          </div>
          <div className="mt-3">
            <IssueBadges issues={t.issues} language={language} />
          </div>
        </div>
      ))}
      {tickets.length > 20 && (
        <p className="muted mt-4 text-xs">
          + {tickets.length - 20} more waiting
        </p>
      )}
    </div>
  ) : (
    <div className="py-12 text-center">
      <Check className="mx-auto mb-4 text-emerald-500" />
      <p className="muted text-sm">No visitors waiting</p>
    </div>
  );
}

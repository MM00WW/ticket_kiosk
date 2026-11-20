import { X } from "lucide-react";
import type { Language } from "@/i18n";
import { issueMessages } from "@/i18n/issues";
import { issueKey, issueLabel, type IssueSelection } from "@/lib/issueCatalog";

export function IssueBadges({
  issues,
  language,
  onRemove,
  disabled = false,
}: {
  issues: IssueSelection[];
  language: Language;
  onRemove?: (issue: IssueSelection) => void;
  disabled?: boolean;
}) {
  const t = issueMessages[language];
  if (!issues.length)
    return <span className="muted text-sm">{t.unspecified}</span>;
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {issues.map((issue) => {
        const label = issueLabel(issue, language);
        return onRemove ? (
          <button
            key={issueKey(issue)}
            type="button"
            disabled={disabled}
            onClick={() => onRemove(issue)}
            aria-label={`${t.remove}: ${label}`}
            className="flex min-h-12 max-w-full items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-left text-sm text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50"
          >
            <span className="min-w-0 break-words">{label}</span>
            <X className="shrink-0" size={18} aria-hidden="true" />
          </button>
        ) : (
          <span
            key={issueKey(issue)}
            className="max-w-full break-words rounded-lg bg-[var(--soft)] px-3 py-2 text-left text-xs leading-5"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

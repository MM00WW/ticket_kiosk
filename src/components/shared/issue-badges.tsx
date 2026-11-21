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
    return <span className="small-note">{t.unspecified}</span>;
  return (
    <div className="issue-badges">
      {issues.map((issue) => {
        const label = issueLabel(issue, language);
        return onRemove ? (
          <button
            key={issueKey(issue)}
            type="button"
            disabled={disabled}
            onClick={() => onRemove(issue)}
            aria-label={`${t.remove}: ${label}`}
            className="selected-issue"
          >
            <span className="wrapping-text">{label}</span>
            <X className="fixed-icon" size={18} aria-hidden="true" />
          </button>
        ) : (
          <span key={issueKey(issue)} className="issue-badge">
            {label}
          </span>
        );
      })}
    </div>
  );
}

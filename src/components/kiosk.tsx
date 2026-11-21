import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  KeyRound,
  LayoutGrid,
  Monitor,
  Package,
  Printer,
  Ticket as TicketIcon,
  Users,
  Wifi,
} from "lucide-react";
import { Button } from "./ui/button";
import { IssueBadges } from "./shared/issue-badges";
import { messages, type Language } from "@/i18n";
import { issueMessages } from "@/i18n/issues";
import {
  issueCatalog,
  issueKey,
  type IssueCategoryCode,
  type IssueSelection,
} from "@/lib/issueCatalog";
import { request } from "@/hooks/useQueue";
import type { Ticket } from "@/types/queue";

const icons = {
  monitor: Monitor,
  key: KeyRound,
  wifi: Wifi,
  apps: LayoutGrid,
  printer: Printer,
  package: Package,
  help: CircleHelp,
};

export function KioskFlow({
  language,
  waiting,
  onCreated,
}: {
  language: Language;
  waiting: number;
  onCreated: () => Promise<void>;
}) {
  const [category, setCategory] = useState<IssueCategoryCode | null>(null);
  const [selected, setSelected] = useState<IssueSelection[]>([]);
  const [issued, setIssued] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const submitting = useRef(false);
  const t = issueMessages[language];
  const common = messages[language];
  const activeCategory = issueCatalog.find((item) => item.code === category);

  function toggleIssue(issue: IssueSelection) {
    setSelected((previous) =>
      previous.some((item) => issueKey(item) === issueKey(issue))
        ? previous.filter((item) => issueKey(item) !== issueKey(issue))
        : [...previous, issue],
    );
  }
  async function submit() {
    if (submitting.current || !selected.length) return;
    submitting.current = true;
    setBusy(true);
    setError(false);
    try {
      const ticket = await request<Ticket>("/api/tickets", {
        issues: selected,
      });
      setIssued(ticket);
      await onCreated();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  function reset() {
    setIssued(null);
    setSelected([]);
    setCategory(null);
    setError(false);
  }

  if (issued)
    return (
      <section
        className="panel ticket-success"
        aria-labelledby="ticket-success"
      >
        <span className="pill success-label">
          <Check size={16} />
          {t.confirmed}
        </span>
        <h1 id="ticket-success" className="success-title">
          {common.success}
        </h1>
        <div className="number success-number">{issued.number}</div>
        <p className="muted">
          {new Date(issued.createdAt).toLocaleTimeString(
            language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
          )}{" "}
          · {issued.queueDate}
        </p>
        <div className="success-requests">
          <h2 className="requests-title">{t.requests}</h2>
          <IssueBadges issues={issued.issues} language={language} />
        </div>
        <p className="success-hint">{t.watch}</p>
        <Button size="lg" className="return-button" onClick={reset}>
          {common.return}
          <ArrowRight className="fixed-icon" />
        </Button>
      </section>
    );

  return (
    <div className="kiosk">
      <div className="kiosk-heading">
        <div>
          <h1 className="kiosk-title">{t.choose}</h1>
          <p className="kiosk-intro">{t.intro}</p>
        </div>
        <div className="pill waiting-count">
          <Users size={18} className="accent" />
          <strong className="large-text">{waiting}</strong>
          {common.waiting}
        </div>
      </div>
      <ol className="steps" aria-label={t.choose}>
        {[t.categoryStep, t.issueStep, t.confirmStep].map((step, index) => (
          <li
            key={step}
            className={`step ${index === (activeCategory ? 1 : 0) ? "active" : ""}`}
          >
            <span className="step-number">{index + 1}</span>
            {step}
            {index < 2 && <ChevronRight size={15} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="kiosk-grid">
        <section className="panel" aria-labelledby="issue-heading">
          {activeCategory ? (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setCategory(null)}
                className="back-button"
              >
                <ArrowLeft size={18} />
                {t.back}
              </Button>
              <h2 id="issue-heading" className="category-title">
                {activeCategory.label[language]}
              </h2>
              <p className="category-intro">{t.subheading}</p>
              <div className="issue-grid">
                {activeCategory.children.map((child) => {
                  const issue: IssueSelection = {
                    category: activeCategory.code,
                    subcategory: child.code,
                  };
                  const checked = selected.some(
                    (item) => issueKey(item) === issueKey(issue),
                  );
                  return (
                    <button
                      key={child.code}
                      type="button"
                      aria-pressed={checked}
                      disabled={busy}
                      onClick={() => toggleIssue(issue)}
                      className={`issue-card ${checked ? "selected" : ""}`}
                    >
                      <span className={`checkbox ${checked ? "selected" : ""}`}>
                        {checked && <Check size={18} aria-hidden="true" />}
                      </span>
                      <span className="wrapping-text">
                        {child.label[language]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="additional-hint">{t.additional}</p>
            </>
          ) : (
            <>
              <h2 id="issue-heading" className="category-heading">
                {t.categoryStep}
              </h2>
              <div className="category-grid">
                {issueCatalog.map((item) => {
                  const Icon = icons[item.icon];
                  const count = selected.filter(
                    (issue) => issue.category === item.code,
                  ).length;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={busy}
                      onClick={() => setCategory(item.code)}
                      className="category-card"
                    >
                      <span className="category-icon">
                        <Icon size={26} aria-hidden="true" />
                      </span>
                      <span className="category-name">
                        {item.label[language]}
                        {count > 0 && (
                          <span className="category-count">
                            {count} {t.selectedCount}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        size={20}
                        className="category-arrow"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
        <aside
          className="panel selected-panel"
          aria-labelledby="selected-heading"
        >
          <div className="selection-heading">
            <h2 id="selected-heading" className="selection-title">
              {t.selected}
            </h2>
            <span className="pill" aria-live="polite">
              {selected.length}
            </span>
          </div>
          {selected.length ? (
            <IssueBadges
              issues={selected}
              language={language}
              onRemove={toggleIssue}
              disabled={busy}
            />
          ) : (
            <p className="selection-empty">{t.none}</p>
          )}
          {error && (
            <p role="alert" className="selection-error">
              {t.failed}
            </p>
          )}
          <Button
            size="lg"
            className="confirm-button"
            disabled={busy || !selected.length}
            onClick={() => void submit()}
          >
            <TicketIcon className="fixed-icon" size={22} />
            <span>{busy ? t.submitting : t.confirm}</span>
          </Button>
          <p className="selection-hint">{t.hint}</p>
        </aside>
      </div>
    </div>
  );
}

"use client";
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
        className="panel mx-auto max-w-3xl text-center !py-12"
        aria-labelledby="ticket-success"
      >
        <span className="pill text-emerald-600">
          <Check size={16} />
          {t.confirmed}
        </span>
        <h1 id="ticket-success" className="mt-6 text-3xl font-bold">
          {common.success}
        </h1>
        <div className="number my-7 text-8xl font-bold text-blue-500 sm:text-9xl">
          {issued.number}
        </div>
        <p className="muted">
          {new Date(issued.createdAt).toLocaleTimeString(
            language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
          )}{" "}
          · {issued.queueDate}
        </p>
        <div className="my-8 rounded-2xl bg-[var(--bg)] p-5 text-left">
          <h2 className="mb-4 font-semibold">{t.requests}</h2>
          <IssueBadges issues={issued.issues} language={language} />
        </div>
        <p className="muted mb-8">{t.watch}</p>
        <Button
          size="lg"
          className="h-auto min-h-20 whitespace-normal py-5"
          onClick={reset}
        >
          {common.return}
          <ArrowRight className="shrink-0" />
        </Button>
      </section>
    );

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.choose}
          </h1>
          <p className="muted mt-3 max-w-3xl leading-7">{t.intro}</p>
        </div>
        <div className="pill !px-4 !py-3">
          <Users size={18} className="text-blue-500" />
          <strong className="text-xl">{waiting}</strong>
          {common.waiting}
        </div>
      </div>
      <ol
        className="muted mb-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        aria-label={t.choose}
      >
        {[t.categoryStep, t.issueStep, t.confirmStep].map((step, index) => (
          <li
            key={step}
            className={`flex items-center gap-2 ${index === (activeCategory ? 1 : 0) ? "font-semibold text-blue-500" : ""}`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--soft)]">
              {index + 1}
            </span>
            {step}
            {index < 2 && <ChevronRight size={15} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel" aria-labelledby="issue-heading">
          {activeCategory ? (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setCategory(null)}
                className="mb-6"
              >
                <ArrowLeft size={18} />
                {t.back}
              </Button>
              <h2 id="issue-heading" className="text-2xl font-bold">
                {activeCategory.label[language]}
              </h2>
              <p className="muted mb-6 mt-2">{t.subheading}</p>
              <div className="grid gap-3 sm:grid-cols-2">
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
                      className={`flex min-h-24 items-center gap-4 rounded-2xl border-2 p-5 text-left text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 ${checked ? "border-blue-500 bg-blue-500/10" : "border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--soft)]"}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-[var(--border)]"}`}
                      >
                        {checked && <Check size={18} aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 break-words">
                        {child.label[language]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="muted mt-6 text-sm leading-6">{t.additional}</p>
            </>
          ) : (
            <>
              <h2 id="issue-heading" className="mb-6 text-xl font-semibold">
                {t.categoryStep}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
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
                      className="flex min-h-32 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 text-left hover:border-blue-500 hover:bg-blue-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                        <Icon size={26} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 break-words text-lg font-semibold">
                        {item.label[language]}
                        {count > 0 && (
                          <span className="mt-2 block text-sm font-normal text-blue-500">
                            {count} {t.selectedCount}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        size={20}
                        className="shrink-0 text-blue-500"
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
          className="panel lg:sticky lg:top-6"
          aria-labelledby="selected-heading"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="selected-heading" className="text-lg font-semibold">
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
            <p className="muted py-5 text-sm">{t.none}</p>
          )}
          {error && (
            <p
              role="alert"
              className="my-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm"
            >
              {t.failed}
            </p>
          )}
          <Button
            size="lg"
            className="mt-6 h-auto min-h-20 w-full whitespace-normal px-5 py-5 text-lg"
            disabled={busy || !selected.length}
            onClick={() => void submit()}
          >
            <TicketIcon className="shrink-0" size={22} />
            <span>{busy ? t.submitting : t.confirm}</span>
          </Button>
          <p className="muted mt-4 text-sm leading-6">{t.hint}</p>
        </aside>
      </div>
    </div>
  );
}

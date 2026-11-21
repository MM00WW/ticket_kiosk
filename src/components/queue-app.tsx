"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Headset, Wifi } from "lucide-react";
import { useQueue } from "@/hooks/useQueue";
import { messages, speechTemplates, type Language } from "@/i18n";
import type { QueueEvent } from "@/types/queue";
import { KioskFlow } from "./kiosk";

import { OperatorView } from "./operator";
import { DisplayView } from "./display";
import { AdminView } from "./admin";

export function QueueApp({
  page,
  windowId = 1,
}: {
  page: "kiosk" | "operator" | "display" | "admin";
  windowId?: number;
}) {
  const [language, setLanguage] = useState<Language>("en");
  const [voice, setVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const voiceRef = useRef(false);
  const langRef = useRef<Language>("en");
  const announcement = (event: QueueEvent) => {
    if (
      page !== "display" ||
      !voiceRef.current ||
      !("speechSynthesis" in window)
    )
      return;
    const payload: unknown = JSON.parse(event.payload);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("number" in payload) ||
      !event.windowId
    )
      return;
    const utterance = new SpeechSynthesisUtterance(
      speechTemplates[langRef.current](String(payload.number), event.windowId),
    );
    utterance.lang = { en: "en-US", zh: "zh-CN", de: "de-DE" }[langRef.current];
    window.speechSynthesis.speak(utterance);
  };
  const { data, connected, error, refresh } = useQueue(announcement);
  const t = messages[language];
  const staffNavigation = page === "admin" || page === "operator";
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    voiceRef.current = voice;
    langRef.current = language;
  }, [voice, language]);
  const waiting = data?.tickets.filter((t) => t.status === "WAITING") ?? [];
  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setNotice("");
    try {
      await work();
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  function enableVoice() {
    if (!("speechSynthesis" in window)) {
      setNotice("Speech synthesis is unavailable in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const test = new SpeechSynthesisUtterance(
      {
        en: "Voice announcements enabled.",
        zh: "语音播报已启用。",
        de: "Sprachausgabe aktiviert.",
      }[language],
    );
    test.lang = { en: "en-US", zh: "zh-CN", de: "de-DE" }[language];
    window.speechSynthesis.speak(test);
    setVoice(true);
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-7 py-5">
          <Link href="/kiosk" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Headset size={23} />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Desk<span className="text-blue-500">Flow</span>
              <span className="muted ml-3 text-xs font-normal">
                IT SERVICE DESK
              </span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className={`${staffNavigation ? "desktop-nav " : ""}flex gap-2`}
          >
            <Link
              className={`nav-link ${page === "kiosk" ? "active" : ""}`}
              href="/kiosk"
            >
              Ticket kiosk
            </Link>
            {staffNavigation && (
              <Link
                className={`nav-link ${page === "operator" ? "active" : ""}`}
                href="/operator/1"
              >
                Operator workspace
              </Link>
            )}
            <Link
              className={`nav-link ${page === "display" ? "active" : ""}`}
              href="/display"
            >
              Live display
            </Link>
            {staffNavigation && (
              <Link
                className={`nav-link ${page === "admin" ? "active" : ""}`}
                href="/admin"
              >
                Overview
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <select
              aria-label="Language"
              value={language}
              onChange={(e) => {
                const value = e.target.value as Language;
                setLanguage(value);
                langRef.current = value;
              }}
            >
              <option value="en">EN</option>
              <option value="zh">中文</option>
              <option value="de">DE</option>
            </select>
          </div>
        </div>
      </header>
      <main className="shell">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <span className="eyebrow">
            WORKPLACE TECHNOLOGY /{" "}
            {page === "operator"
              ? "OPERATOR WORKSPACE"
              : page === "admin"
                ? "DAILY OVERVIEW"
                : page === "display"
                  ? "LIVE QUEUE"
                  : "WELCOME"}
          </span>
          <span
            className={`flex items-center gap-2 text-xs ${connected ? "text-emerald-600" : "text-amber-600"}`}
          >
            <Wifi size={14} />
            {connected ? t.connected : t.disconnected}
          </span>
        </div>
        {(notice || error) && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
          >
            {notice || error}
          </div>
        )}
        {!data && <div className="panel">Connecting to service desk…</div>}
        {data && page === "kiosk" && (
          <KioskFlow
            language={language}
            waiting={waiting.length}
            onCreated={refresh}
          />
        )}
        {data && page === "operator" && (
          <OperatorView
            data={data}
            language={language}
            windowId={windowId}
            now={now}
            busy={busy}
            run={run}
          />
        )}
        {data && page === "display" && (
          <DisplayView
            data={data}
            language={language}
            voice={voice}
            enableVoice={enableVoice}
            setNotice={setNotice}
          />
        )}
        {data && page === "admin" && (
          <AdminView data={data} language={language} />
        )}
        <footer className="muted mt-10 flex justify-between border-t border-[var(--border)] pt-6 text-xs">
          <span>DeskFlow · Workplace support, made simple.</span>
          <span>Local service desk</span>
        </footer>
      </main>
    </div>
  );
}

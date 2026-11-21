import { useEffect, useRef, useState } from "react";
import { Headset, Moon, Sun, Wifi } from "lucide-react";
import { Button } from "./ui/button";
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
  const [dark, setDark] = useState(false);
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
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
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
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <a href="/kiosk" className="header-group">
            <span className="brand-icon">
              <Headset size={23} />
            </span>
            <span className="brand-title">
              Desk<span className="accent">Flow</span>
              <span className="brand-caption">IT SERVICE DESK</span>
            </span>
          </a>
          <nav className="desktop-nav">
            <a
              className={`nav-link ${page === "kiosk" ? "active" : ""}`}
              href="/kiosk"
            >
              Ticket kiosk
            </a>
            <a
              className={`nav-link ${page === "operator" ? "active" : ""}`}
              href="/operator/1"
            >
              Operator workspace
            </a>
            <a
              className={`nav-link ${page === "display" ? "active" : ""}`}
              href="/display"
            >
              Live display
            </a>
            <a
              className={`nav-link ${page === "admin" ? "active" : ""}`}
              href="/admin"
            >
              Overview
            </a>
          </nav>
          <div className="header-group">
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
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
          </div>
        </div>
      </header>
      <main className="shell">
        <div className="page-meta">
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
            className={`connection ${connected ? "connected" : "disconnected"}`}
          >
            <Wifi size={14} />
            {connected ? t.connected : t.disconnected}
          </span>
        </div>
        {(notice || error) && (
          <div role="alert" className="notice">
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
        <footer className="footer">
          <span>DeskFlow · Workplace support, made simple.</span>
          <span>Local service desk</span>
        </footer>
      </main>
    </div>
  );
}

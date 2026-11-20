export const messages = {
  en: {
    welcome: "How can we help?",
    intro:
      "Your IT team is ready to help. Take a ticket and we’ll call you to an available service window.",
    take: "Take a ticket",
    waiting: "People waiting",
    success: "You’re in the queue",
    return: "Take another ticket",
    window: "Window",
    queue: "Waiting queue",
    enable: "Enable voice",
    fullscreen: "Fullscreen",
    latest: "Now calling",
    recent: "Recent announcements",
    empty: "All caught up",
    connected: "Live connection",
    disconnected: "Reconnecting…",
  },
  zh: {
    welcome: "有什么可以帮您？",
    intro: "欢迎来到 IT 服务台。请取号，并等待叫号前往服务窗口。",
    take: "取号",
    waiting: "等待人数",
    success: "取号成功",
    return: "返回继续取号",
    window: "窗口",
    queue: "等待队列",
    enable: "启用语音",
    fullscreen: "全屏",
    latest: "正在叫号",
    recent: "最近叫号",
    empty: "暂无等待",
    connected: "实时连接正常",
    disconnected: "正在重新连接…",
  },
  de: {
    welcome: "Wie können wir helfen?",
    intro:
      "Ihr IT-Team hilft Ihnen gerne. Ziehen Sie eine Nummer und warten Sie auf Ihren Aufruf.",
    take: "Nummer ziehen",
    waiting: "Wartende Personen",
    success: "Sie sind in der Warteschlange",
    return: "Weitere Nummer ziehen",
    window: "Schalter",
    queue: "Warteschlange",
    enable: "Sprachausgabe aktivieren",
    fullscreen: "Vollbild",
    latest: "Aktueller Aufruf",
    recent: "Letzte Aufrufe",
    empty: "Niemand wartet",
    connected: "Live verbunden",
    disconnected: "Verbindung wird hergestellt…",
  },
};
export type Language = keyof typeof messages;
export const speechTemplates: Record<
  Language,
  (number: string, window: number) => string
> = {
  en: (n, w) => `${n}, please go to window ${w}.`,
  zh: (n, w) => `${n}，请到 ${w} 号窗口。`,
  de: (n, w) => `${n}, bitte zu Schalter ${w}.`,
};

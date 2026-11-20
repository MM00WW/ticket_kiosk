import { z } from "zod";
import type { Language } from "../i18n";

type Labels = Record<Language, string>;
function labels(en: string, zh: string, de: string): Labels {
  return { en, zh, de };
}

// 分类代码写入数据库，显示文字可以独立翻译，不随语言变化。
export const issueCatalog = [
  {
    code: "hardware",
    icon: "monitor",
    label: labels("Computer & hardware", "电脑与硬件", "Computer & Hardware"),
    children: [
      {
        code: "boot",
        label: labels("Won’t turn on", "无法开机", "Startet nicht"),
      },
      {
        code: "performance",
        label: labels(
          "Slow or frozen computer",
          "运行缓慢／死机",
          "Langsam oder eingefroren",
        ),
      },
      {
        code: "screen",
        label: labels(
          "Screen or display issue",
          "屏幕／显示问题",
          "Bildschirmproblem",
        ),
      },
      {
        code: "power",
        label: labels(
          "Battery or power issue",
          "电池／电源问题",
          "Akku- oder Stromproblem",
        ),
      },
      {
        code: "hardware-other",
        label: labels(
          "Other hardware issue / unsure",
          "其他硬件问题／不确定",
          "Andere Hardwarefrage / unsicher",
        ),
      },
    ],
  },
  {
    code: "account",
    icon: "key",
    label: labels("Account & sign-in", "账号与登录", "Konto & Anmeldung"),
    children: [
      {
        code: "password-reset",
        label: labels("Reset password", "密码重置", "Passwort zurücksetzen"),
      },
      {
        code: "locked",
        label: labels("Account locked", "账号锁定", "Konto gesperrt"),
      },
      {
        code: "sign-in",
        label: labels(
          "Unable to sign in",
          "无法登录",
          "Anmeldung nicht möglich",
        ),
      },
      {
        code: "mfa",
        label: labels(
          "Multi-factor authentication",
          "多因素认证问题",
          "Mehrfaktor-Authentifizierung",
        ),
      },
      {
        code: "account-other",
        label: labels(
          "Other account issue / unsure",
          "其他账号问题／不确定",
          "Andere Kontofrage / unsicher",
        ),
      },
    ],
  },
  {
    code: "network",
    icon: "wifi",
    label: labels("Network & VPN", "网络与 VPN", "Netzwerk & VPN"),
    children: [
      {
        code: "wifi",
        label: labels("Wi-Fi connection", "Wi-Fi 连接", "WLAN-Verbindung"),
      },
      {
        code: "ethernet",
        label: labels("Wired network", "有线网络", "Kabelgebundenes Netzwerk"),
      },
      {
        code: "vpn",
        label: labels("VPN connection", "VPN 连接", "VPN-Verbindung"),
      },
      {
        code: "access",
        label: labels(
          "Website or internal resource access",
          "无法访问网站／内部资源",
          "Zugriff auf Webseiten / interne Ressourcen",
        ),
      },
      {
        code: "network-other",
        label: labels(
          "Other network issue / unsure",
          "其他网络问题／不确定",
          "Andere Netzwerkfrage / unsicher",
        ),
      },
    ],
  },
  {
    code: "software",
    icon: "apps",
    label: labels(
      "Software & applications",
      "软件与应用",
      "Software & Anwendungen",
    ),
    children: [
      {
        code: "install",
        label: labels(
          "Install or update software",
          "软件安装／更新",
          "Software installieren / aktualisieren",
        ),
      },
      {
        code: "app-error",
        label: labels(
          "Application error or won’t open",
          "软件报错／无法启动",
          "Anwendungsfehler / startet nicht",
        ),
      },
      {
        code: "email",
        label: labels(
          "Email or calendar",
          "邮件／日历问题",
          "E-Mail oder Kalender",
        ),
      },
      {
        code: "meetings",
        label: labels(
          "Teams or meetings",
          "Teams／会议问题",
          "Teams oder Besprechungen",
        ),
      },
      {
        code: "software-other",
        label: labels(
          "Other software issue / unsure",
          "其他软件问题／不确定",
          "Andere Softwarefrage / unsicher",
        ),
      },
    ],
  },
  {
    code: "peripherals",
    icon: "printer",
    label: labels("Printing & peripherals", "打印与外设", "Drucken & Zubehör"),
    children: [
      {
        code: "printing",
        label: labels("Unable to print", "无法打印", "Drucken nicht möglich"),
      },
      {
        code: "printer-setup",
        label: labels("Set up a printer", "打印机配置", "Drucker einrichten"),
      },
      {
        code: "keyboard-mouse",
        label: labels(
          "Keyboard or mouse",
          "键盘／鼠标问题",
          "Tastatur oder Maus",
        ),
      },
      {
        code: "audio-video",
        label: labels(
          "Headset or camera",
          "耳机／摄像头问题",
          "Headset oder Kamera",
        ),
      },
      {
        code: "peripherals-other",
        label: labels(
          "Other peripheral issue / unsure",
          "其他外设问题／不确定",
          "Andere Zubehörfrage / unsicher",
        ),
      },
    ],
  },
  {
    code: "equipment",
    icon: "package",
    label: labels(
      "Device collection & return",
      "设备领取／归还",
      "Geräteausgabe & Rückgabe",
    ),
    children: [
      {
        code: "collect",
        label: labels("Collect a device", "领取设备", "Gerät abholen"),
      },
      {
        code: "return",
        label: labels("Return a device", "归还设备", "Gerät zurückgeben"),
      },
      {
        code: "replace",
        label: labels("Replace a device", "更换设备", "Gerät austauschen"),
      },
      {
        code: "borrow",
        label: labels("Borrow a device", "借用设备", "Gerät ausleihen"),
      },
      {
        code: "equipment-other",
        label: labels(
          "Other device request / unsure",
          "其他设备办理需求／不确定",
          "Andere Geräteanfrage / unsicher",
        ),
      },
    ],
  },
  {
    code: "other",
    icon: "help",
    label: labels("Other / not sure", "其他／不确定", "Sonstiges / unsicher"),
    children: [
      {
        code: "unsure",
        label: labels(
          "Not sure what the issue is",
          "不知道问题属于哪类",
          "Problem nicht einzuordnen",
        ),
      },
      {
        code: "advice",
        label: labels("IT guidance", "IT 使用咨询", "IT-Beratung"),
      },
      {
        code: "other-request",
        label: labels(
          "Another service request",
          "其他服务需求",
          "Andere Serviceanfrage",
        ),
      },
    ],
  },
] as const;

export type IssueCategoryCode = (typeof issueCatalog)[number]["code"];
export type IssueSubcategoryCode =
  (typeof issueCatalog)[number]["children"][number]["code"];
export const MAX_ISSUES = issueCatalog.reduce(
  (count, category) => count + category.children.length,
  0,
);
const categoryCodes = new Set<string>(
  issueCatalog.map((category) => category.code),
);
const subcategoryCodes = new Set<string>(
  issueCatalog.flatMap((category) =>
    category.children.map((child) => child.code),
  ),
);

export const issueSelectionSchema = z
  .object({
    category: z.custom<IssueCategoryCode>(
      (value) => typeof value === "string" && categoryCodes.has(value),
      "Unknown issue category.",
    ),
    subcategory: z.custom<IssueSubcategoryCode>(
      (value) => typeof value === "string" && subcategoryCodes.has(value),
      "Unknown issue subcategory.",
    ),
  })
  .strict()
  .superRefine((issue, ctx) => {
    const parent = issueCatalog.find(
      (category) => category.code === issue.category,
    );
    if (!parent?.children.some((child) => child.code === issue.subcategory))
      ctx.addIssue({
        code: "custom",
        path: ["subcategory"],
        message: "Subcategory does not belong to the selected category.",
      });
  });
export type IssueSelection = z.infer<typeof issueSelectionSchema>;
export const defaultIssues: IssueSelection[] = [
  { category: "other", subcategory: "unsure" },
];
export const storedIssuesSchema = z.array(issueSelectionSchema).max(MAX_ISSUES);
export const createTicketSchema = z
  .object({
    issues: z
      .array(issueSelectionSchema)
      .min(1, "Select at least one issue.")
      .transform((issues) => {
        // 先去重，再限制不同问题数量，重复点击不会生成重复需求。
        const unique = new Map(issues.map((issue) => [issueKey(issue), issue]));
        return [...unique.values()];
      })
      .pipe(z.array(issueSelectionSchema).max(MAX_ISSUES))
      .default(defaultIssues),
  })
  .strict();

export function issueKey(issue: IssueSelection) {
  return `${issue.category}:${issue.subcategory}`;
}
export function issueLabel(issue: IssueSelection, language: Language) {
  const parent = issueCatalog.find(
    (category) => category.code === issue.category,
  );
  const child = parent?.children.find(
    (child) => child.code === issue.subcategory,
  );
  return `${parent?.label[language] ?? issue.category} › ${child?.label[language] ?? issue.subcategory}`;
}
export function withTypedIssues<T extends { issues: unknown }>(ticket: T) {
  return { ...ticket, issues: storedIssuesSchema.parse(ticket.issues) };
}

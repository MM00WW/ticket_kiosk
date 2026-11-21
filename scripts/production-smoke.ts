import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdirSync, openSync, closeSync } from "node:fs";
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { defaultIssues, type IssueSelection } from "../src/lib/issueCatalog";
const selectedIssues: IssueSelection[] = [
  { category: "account", subcategory: "password-reset" },
  { category: "network", subcategory: "vpn" },
];
const port = 3101;
const useBat = process.argv.includes("--bat");
const base = `http://localhost:${port}`;
const env = {
  ...process.env,
  DATABASE_URL: "file:./data/production-test.db",
  PORT: String(port),
  DESKFLOW_NO_PAUSE: "1",
};
mkdirSync("data", { recursive: true });
closeSync(openSync("data/production-test.db", "a"));
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env, stdio: "pipe" },
);
// 所有集成测试只使用独立数据库，不修改演示或正式数据。
process.env.DATABASE_URL = env.DATABASE_URL;
const { db } = await import("../src/server/db");
await db.queueEvent.deleteMany();
await db.ticket.deleteMany();
await db.serviceWindow.deleteMany();
for (let id = 1; id <= 4; id++)
  await db.serviceWindow.create({ data: { id, name: `Window ${id}` } });
await db.systemSetting.upsert({
  where: { key: "speechLanguage" },
  update: {},
  create: { key: "speechLanguage", value: "en" },
});
await db.$disconnect();
let server: ChildProcess | undefined;
let output = "";
async function start() {
  server = spawn(
    useBat ? "cmd.exe" : process.execPath,
    useBat
      ? ["/d", "/c", "start-server.bat"]
      : ["--import", "tsx", "server.ts", "--production"],
    { env, stdio: "pipe", windowsHide: true },
  );
  server.stdout?.on("data", (b) => {
    output += String(b);
  });
  server.stderr?.on("data", (b) => {
    output += String(b);
  });
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(`${base}/api/queue`);
      if (response.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server start timeout: ${output}`);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    if (useBat && child.pid)
      execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "pipe",
        windowsHide: true,
      });
    else child.kill();
  });
}
async function post(path: string, body: unknown = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await res.json();
  return { status: res.status, ...value };
}
async function snapshot() {
  return (await (await fetch(`${base}/api/queue`)).json()).data;
}
const socket = io(base, { autoConnect: false, reconnectionDelay: 100 });
function nextEvent(name: string) {
  return new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Missing Socket.IO event: ${name}`)),
      5000,
    );
    socket.once(name, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}
try {
  await start();
  for (const path of [
    "/kiosk",
    "/operator/1",
    "/operator/2",
    "/operator/3",
    "/operator/4",
    "/display",
    "/admin",
  ])
    assert.equal((await fetch(`${base}${path}`)).status, 200);
  const connect = nextEvent("connect");
  socket.connect();
  await connect;
  // 线上工单期间不能手工叫号，取号本身也不会分配窗口。
  assert.equal((await post("/api/windows/3/online-work")).status, 409);
  await post("/api/windows/3/online");
  const workUpdated = nextEvent("window:updated");
  assert.equal((await post("/api/windows/3/online-work")).status, 200);
  assert.equal(((await workUpdated) as { windowId: number }).windowId, 3);
  const working = (await snapshot()).windows[2];
  assert.equal(working.status, "ONLINE_WORK");
  assert.equal(working.currentTicketId, null);
  for (const action of ["call-next", "start", "complete", "online-work"])
    assert.equal((await post(`/api/windows/3/${action}`)).status, 409);
  for (let i = 1; i <= 3; i++) {
    const created = nextEvent("ticket:created");
    const legacyResponse =
      i === 2 ? await fetch(`${base}/api/tickets`, { method: "POST" }) : null;
    const result = legacyResponse
      ? {
          status: legacyResponse.status,
          ...(await legacyResponse.json()),
        }
      : await post(
          "/api/tickets",
          i === 1 ? { issues: [...selectedIssues, selectedIssues[0]] } : {},
        );
    assert.equal(result.status, 201);
    assert.equal(result.data.number, `A00${i}`);
    assert.deepEqual(
      result.data.issues,
      i === 1 ? selectedIssues : defaultIssues,
    );
    assert.deepEqual(
      JSON.parse(((await created) as { payload: string }).payload).issues,
      i === 1 ? selectedIssues : defaultIssues,
    );
  }
  for (const body of [
    { issues: [] },
    { issues: [{ category: "network", subcategory: "password-reset" }] },
    { issues: [{ category: "invalid", subcategory: "vpn" }] },
    { issues: [{ category: "network", subcategory: "invalid" }] },
  ])
    assert.equal((await post("/api/tickets", body)).status, 400);
  assert.equal(
    (
      await fetch(`${base}/api/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{broken",
      })
    ).status,
    400,
  );
  assert.equal(
    (await snapshot()).tickets.filter(
      (t: { status: string }) => t.status === "WAITING",
    ).length,
    3,
  );
  await post("/api/windows/1/online");
  assert.equal((await post("/api/windows/1/online-work")).status, 200);
  assert.equal((await post("/api/windows/1/finish-online-work")).status, 200);
  assert.equal((await snapshot()).windows[0].status, "IDLE");
  assert.equal((await post("/api/windows/1/finish-online-work")).status, 409);
  const called = nextEvent("ticket:called");
  await post("/api/windows/1/call-next");
  const call = (await called) as { id: string; payload: string };
  assert.equal(JSON.parse(call.payload).number, "A001");
  assert.deepEqual(
    (await snapshot()).tickets.find(
      (ticket: { number: string }) => ticket.number === "A001",
    ).issues,
    selectedIssues,
  );
  const recalled = nextEvent("ticket:recalled");
  await post("/api/windows/1/recall");
  assert.notEqual(((await recalled) as { id: string }).id, call.id);
  await post("/api/windows/2/online");
  await post("/api/windows/2/call-next");
  assert.equal((await post("/api/windows/1/online-work")).status, 409);
  await post("/api/windows/1/start");
  assert.equal((await post("/api/windows/1/online-work")).status, 409);
  const completed = nextEvent("ticket:completed");
  await post("/api/windows/1/complete");
  await completed;
  let state = await snapshot();
  assert.equal(state.windows[0].status, "IDLE");
  assert.equal(
    state.tickets.find((t: { number: string }) => t.number === "A003").status,
    "WAITING",
  );
  await post("/api/windows/1/call-next");
  state = await snapshot();
  assert.equal(
    state.tickets.find((t: { number: string }) => t.number === "A003").windowId,
    1,
  );
  assert.deepEqual(
    state.tickets.find((ticket: { number: string }) => ticket.number === "A002")
      .issues,
    defaultIssues,
  );
  assert.equal((await post("/api/windows/1/offline")).status, 409);
  for (const action of ["mode", "ready", "cancel-ready"])
    assert.equal((await post(`/api/windows/1/${action}`)).status, 400);
  assert.equal((await post("/api/windows/9/online")).status, 400);
  // 强制断开底层连接后自动重连；connect 时重新 GET 权威完整状态。
  let recovered: Promise<unknown> | undefined;
  socket.once("connect", () => {
    recovered = snapshot();
  });
  const reconnected = nextEvent("connect");
  socket.io.engine?.close();
  await post("/api/tickets");
  await reconnected;
  const restored = (await recovered) as {
    tickets: { number: string; issues: IssueSelection[] }[];
  };
  assert.equal(restored.tickets.length, 4);
  assert.deepEqual(
    restored.tickets.find((ticket) => ticket.number === "A001")?.issues,
    selectedIssues,
  );
  socket.disconnect();
  await stop();
  await start();
  state = await snapshot();
  assert.equal(state.tickets.length, 4);
  assert.equal(state.windows[0].status, "CALLING");
  assert.deepEqual(
    state.tickets.find((ticket: { number: string }) => ticket.number === "A001")
      .issues,
    selectedIssues,
  );
  assert.equal(state.windows[2].status, "ONLINE_WORK");
  assert.equal((await post("/api/windows/3/finish-online-work")).status, 200);
  assert.equal((await snapshot()).windows[2].status, "IDLE");
  // 空闲窗口不会因为新增号码而自动接单。
  await post("/api/windows/4/online");
  assert.equal((await snapshot()).windows[2].currentTicketId, null);
  // 并发取号与并发叫号仍不能重复编号或重复分配。
  const createdTogether = await Promise.all([
    post("/api/tickets"),
    post("/api/tickets"),
  ]);
  assert.ok(createdTogether.every((r) => r.status === 201));
  assert.notEqual(
    createdTogether[0].data.number,
    createdTogether[1].data.number,
  );
  const beforeCalling = await snapshot();
  assert.equal(beforeCalling.windows[2].status, "IDLE");
  assert.equal(beforeCalling.windows[3].status, "IDLE");
  assert.equal(beforeCalling.windows[2].currentTicketId, null);
  assert.equal(beforeCalling.windows[3].currentTicketId, null);
  const allocatedTogether = await Promise.all([
    post("/api/windows/3/call-next"),
    post("/api/windows/4/call-next"),
  ]);
  assert.ok(allocatedTogether.every((r) => r.status === 200));
  assert.notEqual(
    allocatedTogether[0].data.currentTicketId,
    allocatedTogether[1].data.currentTicketId,
  );
  console.log(
    "PASS: 7 production pages, acceptance flow, issue persistence + validation + legacy API, typed socket broadcasts, recall event IDs, automatic reconnect + issue recovery, persistence after restart, online work transitions + allocation exclusion + restart recovery, concurrent allocation.",
  );
} finally {
  socket.disconnect();
  await stop();
}

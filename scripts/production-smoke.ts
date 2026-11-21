import { spawn, execFileSync, type ChildProcess } from "node:child_process";
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
};
// 独立测试数据库，不清理日常使用的 queue.db。
process.env.DATABASE_URL = env.DATABASE_URL;
const { db } = await import("../src/server/db");
db.exec(
  "DELETE FROM QueueEvent; DELETE FROM Ticket; DELETE FROM ServiceWindow;",
);
for (let id = 1; id <= 4; id++)
  db.prepare("INSERT INTO ServiceWindow(id, name) VALUES (?, ?)").run(
    id,
    `Window ${id}`,
  );
db.close();
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
  await post("/api/windows/1/online");
  await post("/api/windows/1/mode", { mode: "AUTO" });
  const called = nextEvent("ticket:called");
  await post("/api/windows/1/ready");
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
  await post("/api/windows/1/start");
  const completed = nextEvent("ticket:completed");
  await post("/api/windows/1/complete");
  await completed;
  let state = await snapshot();
  assert.equal(state.windows[0].status, "IDLE");
  assert.equal(
    state.tickets.find((t: { number: string }) => t.number === "A003").status,
    "WAITING",
  );
  await post("/api/windows/1/ready");
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
  assert.equal(
    (await post("/api/windows/1/mode", { mode: "INVALID" })).status,
    400,
  );
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
  // 同时取号、两个窗口同时叫号：序号连续，分配不同号码。
  const issued = await Promise.all(
    Array.from({ length: 12 }, () => post("/api/tickets")),
  );
  assert.ok(issued.every((result) => result.status === 201));
  assert.deepEqual(
    issued.map((result) => result.data.sequence).sort((a, b) => a - b),
    Array.from({ length: 12 }, (_, index) => index + 5),
  );
  await post("/api/windows/3/online");
  await post("/api/windows/4/online");
  const assigned = await Promise.all([
    post("/api/windows/3/call-next"),
    post("/api/windows/4/call-next"),
  ]);
  assert.ok(assigned.every((result) => result.status === 200));
  assert.notEqual(
    assigned[0].data.currentTicketId,
    assigned[1].data.currentTicketId,
  );
  state = await snapshot();
  assert.deepEqual(
    state.tickets
      .filter(
        (ticket: { windowId: number }) =>
          ticket.windowId === 3 || ticket.windowId === 4,
      )
      .map((ticket: { number: string }) => ticket.number)
      .sort(),
    ["A004", "A005"],
  );
  // 重复操作只成功一次，失败操作不会多写事件。
  const before = state.events.length;
  const starts = await Promise.all([
    post("/api/windows/3/start"),
    post("/api/windows/3/start"),
  ]);
  assert.deepEqual(starts.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await snapshot()).events.length, before + 2);
  assert.equal((await post("/api/windows/3/complete")).status, 200);
  assert.equal((await post("/api/windows/4/no-show")).status, 200);
  assert.equal((await post("/api/windows/4/pause")).status, 200);
  assert.equal((await post("/api/windows/4/resume")).status, 200);
  assert.equal((await fetch(`${base}/operator/9`)).status, 404);
  assert.equal((await fetch(`${base}/api/missing`)).status, 404);
  console.log(
    "PASS: 7 pages, manual/auto flow, input validation, Socket.IO + reconnect, restart persistence, 12 concurrent tickets, concurrent FIFO allocation, duplicate-action rollback, no-show and pause/resume.",
  );
} finally {
  socket.disconnect();
  await stop();
}

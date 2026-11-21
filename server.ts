import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { z } from "zod";
import { api } from "./src/server/api";
import { db, getWindows } from "./src/server/db";
import {
  actionSchema,
  createTicket,
  getSnapshot,
  windowAction,
} from "./src/server/queueService";
import { setSocketServer } from "./src/server/socketServer";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./src/types/queue";

const production = process.argv.includes("--production");
const port = Number(process.env.PORT ?? 3000);
const app = express();
app.disable("x-powered-by");
app.use(express.json());

// API 统一保留 { data } / { error } 格式，页面不用跟着改。
async function send(res: express.Response, work: () => unknown, status = 200) {
  const result = await api(work, status);
  res.status(result.status).json(await result.json());
}
app.get("/api/queue", (_req, res) => {
  void send(res, getSnapshot);
});
app.get("/api/windows", (_req, res) => {
  void send(res, getWindows);
});
app.post("/api/tickets", (req, res) => {
  void send(res, () => createTicket(req.body ?? {}), 201);
});
app.post("/api/windows/:id/:action", (req, res) => {
  void send(res, () => {
    const id = z.coerce.number().int().min(1).max(4).parse(req.params.id);
    return windowAction(
      id,
      actionSchema.parse(req.params.action),
      req.body ?? {},
    );
  });
});
const jsonError: express.ErrorRequestHandler = (error, _req, res, next) => {
  if (error.type === "entity.parse.failed") {
    res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
    });
  } else next(error);
};
app.use(jsonError);
app.use("/api", (_req, res) => {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Unknown API." } });
});
app.get("/", (_req, res) => {
  res.redirect("/kiosk");
});
app.use((req, res, next) => {
  if (
    req.path.startsWith("/operator/") &&
    !/^\/operator\/[1-4]$/.test(req.path)
  ) {
    res.status(404).send("Window not found");
  } else next();
});

const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
setSocketServer(io);
io.on("connection", (socket) =>
  socket.emit("queue:updated", { id: crypto.randomUUID() }),
);

// 开发时 Vite 提供热更新，生产时直接提供构建后的静态文件。
let closeFrontend = async () => {};
if (production) {
  app.use(express.static(resolve("dist")));
  app.get(["/kiosk", "/display", "/admin", "/operator/:id"], (_req, res) => {
    res.sendFile(resolve("dist/index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
  });
  app.use(vite.middlewares);
  closeFrontend = () => vite.close();
}
server.listen(port, "0.0.0.0", () =>
  console.log(`Service Desk: http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await closeFrontend();
    io.close();
    server.close();
    db.close();
    process.exit(0);
  });
}

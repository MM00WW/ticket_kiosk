import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setSocketServer } from "./src/server/socketServer";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./src/types/queue";
const dev = !process.argv.includes("--production");
Object.assign(process.env, { NODE_ENV: dev ? "development" : "production" });
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname: "0.0.0.0", port });
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((req, res) => {
  void handler(req, res);
});
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
setSocketServer(io);
io.on("connection", (socket) =>
  socket.emit("queue:updated", { id: crypto.randomUUID() }),
);
server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. DeskFlow may already be running at http://localhost:${port}/kiosk. Stop the existing server before starting again.`,
    );
  } else {
    console.error("DeskFlow could not start:", error);
  }
  process.exit(1);
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Service Desk: http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    io.close();
    server.close();
    void app.close().then(() => process.exit(0));
  });

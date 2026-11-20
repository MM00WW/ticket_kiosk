import { z } from "zod";
import { AppError } from "../errors";
import { mutate } from "./transaction";
import { allocate, allocateReady } from "./allocationService";
import { record } from "./eventService";
import { serviceSession } from "./serviceSession";
export const actionSchema = z.enum([
  "online",
  "ready",
  "cancel-ready",
  "call-next",
  "recall",
  "start",
  "complete",
  "no-show",
  "mode",
  "pause",
  "resume",
  "offline",
]);
export type WindowAction = z.infer<typeof actionSchema>;
export function windowAction(id: number, action: WindowAction, body: unknown) {
  return mutate(async (tx) => {
    const window = await tx.serviceWindow.findUnique({ where: { id } });
    if (!window)
      throw new AppError(404, "WINDOW_NOT_FOUND", "Window not found.");
    if (action === "mode") {
      const { mode } = z
        .object({ mode: z.enum(["MANUAL", "AUTO"]) })
        .strict()
        .parse(body);
      await tx.serviceWindow.update({
        where: { id },
        data: {
          allocationMode: mode,
          ...(window.status === "READY" && mode === "MANUAL"
            ? { status: "IDLE", readyAt: null }
            : {}),
        },
      });
    } else if (["start", "complete", "no-show", "recall"].includes(action)) {
      await serviceSession(
        tx,
        window,
        action as "start" | "complete" | "no-show" | "recall",
      );
    } else if (action === "call-next") {
      if (!(await allocate(tx, id, false)))
        throw new AppError(409, "QUEUE_EMPTY", "No tickets are waiting.");
    } else {
      const transitions = {
        online: ["OFFLINE", "IDLE"],
        ready: ["IDLE", "READY"],
        "cancel-ready": ["READY", "IDLE"],
        pause: ["IDLE", "PAUSED"],
        resume: ["PAUSED", "IDLE"],
        offline: ["IDLE", "OFFLINE"],
      } as const;
      const [from, to] = transitions[action as keyof typeof transitions];
      if (
        window.status !== from ||
        (action === "ready" && window.allocationMode !== "AUTO")
      )
        throw new AppError(
          409,
          "INVALID_STATE",
          `Cannot ${action} from ${window.status}.`,
        );
      await tx.serviceWindow.update({
        where: { id },
        data: { status: to, readyAt: to === "READY" ? new Date() : null },
      });
      if (to === "READY") await allocateReady(tx);
    }
    await record(tx, "window:updated", id, undefined, { action });
    return tx.serviceWindow.findUniqueOrThrow({ where: { id } });
  });
}

import { z } from "zod";
import { api } from "@/server/api";
import { actionSchema, windowAction } from "@/server/services/windowService";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  return api(async () => {
    const params = await context.params;
    const id = z.coerce.number().int().min(1).max(4).parse(params.id);
    const action = actionSchema.parse(params.action);
    let body: unknown = {};
    if (action === "mode") {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }
    return windowAction(id, action, body);
  });
}

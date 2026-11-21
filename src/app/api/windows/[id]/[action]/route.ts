import { z } from "zod";
import { api } from "@/server/api";
import { actionSchema, windowAction } from "@/server/queueService";
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  return api(async () => {
    const params = await context.params;
    const id = z.coerce.number().int().min(1).max(4).parse(params.id);
    const action = actionSchema.parse(params.action);
    return windowAction(id, action);
  });
}

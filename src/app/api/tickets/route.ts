import { api, AppError } from "@/server/api";
import { createTicket } from "@/server/queueService";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(async () => {
    const text = await request.text();
    let body: unknown = {};
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new AppError(
          400,
          "INVALID_JSON",
          "Request body must be valid JSON.",
        );
      }
    }
    return createTicket(body);
  }, 201);
}

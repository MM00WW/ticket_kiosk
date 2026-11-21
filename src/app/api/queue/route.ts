import { api } from "@/server/api";
import { getSnapshot } from "@/server/queueService";
export const dynamic = "force-dynamic";
export async function GET() {
  return api(getSnapshot);
}

import { api } from "@/server/api";
import { db } from "@/server/db";
export const dynamic = "force-dynamic";
export async function GET() {
  return api(() => db.serviceWindow.findMany({ orderBy: { id: "asc" } }));
}

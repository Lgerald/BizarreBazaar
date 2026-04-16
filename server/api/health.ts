import type { ApiContext } from "./types";
import { json } from "../http/httpUtil";

export async function handleHealthApi(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, prisma } = ctx;

  if (pathname === "/api/health" && method === "GET") {
    return json({ ok: true });
  }
  if (pathname === "/api/ok" && method === "GET") {
    return json({ ok: true });
  }
  if (pathname === "/api/db-ok" && method === "GET") {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return json({ ok: true });
    } catch {
      return json({ ok: false }, { status: 500 });
    }
  }

  return null;
}

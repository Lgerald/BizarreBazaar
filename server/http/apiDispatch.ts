import type { PrismaClient } from "../../generated/prisma/client/client";
import { handleBooksApi } from "../api/books";
import { handleCalendarApi } from "../api/calendar";
import { handleEventProposalsApi } from "../api/eventProposals";
import { handleHealthApi } from "../api/health";
import { handleMeApi } from "../api/me";
import { handleSessionHttp } from "../api/sessionHttp";
import type { ApiContext } from "../api/types";
import { handleUsersApi } from "../api/users";
import { json } from "./httpUtil";
import { getPrisma } from "../prisma";

const handlers: Array<(ctx: ApiContext) => Promise<Response | null>> = [
  handleHealthApi,
  handleSessionHttp,
  handleMeApi,
  handleUsersApi,
  handleBooksApi,
  handleCalendarApi,
  handleEventProposalsApi,
];

export async function handleApiRequest(
  request: globalThis.Request,
  opts?: { prisma?: PrismaClient }
): Promise<Response> {
  const prisma = opts?.prisma ?? getPrisma();
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  const ctx: ApiContext = { request, pathname, method, url, prisma };

  for (const handler of handlers) {
    const res = await handler(ctx);
    if (res) return res;
  }

  return json({ ok: false, error: "not found" }, { status: 404 });
}

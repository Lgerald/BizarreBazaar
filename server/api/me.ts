import { verifyWebRequestSession } from "../auth/session";
import { json } from "../http/httpUtil";
import type { ApiContext } from "./types";

export async function handleMeApi(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, request, prisma } = ctx;

  if (pathname !== "/api/me" || method !== "GET") return null;

  const firebaseUser = await verifyWebRequestSession(request);
  if (!firebaseUser) return json({ ok: false }, { status: 401 });
  const email = firebaseUser.email;
  const appUser = email ? await prisma.user.findUnique({ where: { email } }) : null;
  return json({ ok: true, firebaseUser, appUser });
}

import type { AuthUser } from "../auth/session";
import { verifyWebRequestSession } from "../auth/session";
import { json } from "./httpUtil";

/** Returns the signed-in user or a 401 JSON response. */
export async function requireUserOr401(
  request: globalThis.Request
): Promise<Response | AuthUser> {
  const user = await verifyWebRequestSession(request);
  if (!user) {
    return json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return user;
}

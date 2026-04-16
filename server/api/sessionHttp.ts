import { handleWebSessionLogin, handleWebSessionLogout } from "../auth/session";
import type { ApiContext } from "./types";

export async function handleSessionHttp(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, request } = ctx;

  if (pathname === "/api/session/login" && method === "POST") {
    return handleWebSessionLogin(request);
  }
  if (pathname === "/api/session/logout" && method === "POST") {
    return handleWebSessionLogout();
  }

  return null;
}

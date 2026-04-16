import { serialize } from "cookie";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { getFirebaseAuth, isFirebaseAdminConfigured } from "./firebaseAdmin";

export const SESSION_COOKIE_NAME = "bb_session";

const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

function cookieOptions(req: ExpressRequest) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_EXPIRES_IN_MS,
  };
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

async function verifySessionCookieValue(cookie: string | undefined): Promise<AuthUser | null> {
  if (!cookie) return null;
  if (!isFirebaseAdminConfigured()) return null;

  try {
    const decoded = await getFirebaseAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: (decoded as any).name,
      picture: (decoded as any).picture,
    };
  } catch {
    return null;
  }
}

export async function verifyRequestSession(req: ExpressRequest): Promise<AuthUser | null> {
  const cookie = (req as any).cookies?.[SESSION_COOKIE_NAME];
  return verifySessionCookieValue(cookie);
}

export async function verifyWebRequestSession(request: globalThis.Request): Promise<AuthUser | null> {
  const parsed = parseCookieHeader(request.headers.get("cookie"));
  return verifySessionCookieValue(parsed[SESSION_COOKIE_NAME]);
}

export async function handleSessionLogin(req: ExpressRequest, res: ExpressResponse) {
  if (!isFirebaseAdminConfigured()) {
    return res.status(501).json({
      ok: false,
      error:
        "Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    });
  }

  const idToken =
    typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
  if (!idToken) return res.status(400).json({ ok: false, error: "idToken required" });

  try {
    const auth = getFirebaseAuth();
    await auth.verifyIdToken(idToken);
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    res.cookie(SESSION_COOKIE_NAME, sessionCookie, cookieOptions(req));
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("POST /api/session/login failed", err);
    return res.status(401).json({ ok: false, error: "invalid token" });
  }
}

export async function handleSessionLogout(req: ExpressRequest, res: ExpressResponse) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
}

export async function handleMe(req: ExpressRequest, res: ExpressResponse) {
  const user = await verifyRequestSession(req);
  if (!user) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user });
}

export async function handleWebSessionLogin(request: globalThis.Request): Promise<globalThis.Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      {
        ok: false,
        error:
          "Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
      },
      { status: 501 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
  if (!idToken) return Response.json({ ok: false, error: "idToken required" }, { status: 400 });

  try {
    const auth = getFirebaseAuth();
    await auth.verifyIdToken(idToken);
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    const isProd = process.env.NODE_ENV === "production";
    const setCookie = serialize(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(SESSION_EXPIRES_IN_MS / 1000),
    });

    return Response.json(
      { ok: true },
      {
        status: 201,
        headers: { "Set-Cookie": setCookie },
      }
    );
  } catch (err) {
    console.error("POST /api/session/login failed", err);
    return Response.json({ ok: false, error: "invalid token" }, { status: 401 });
  }
}

export function handleWebSessionLogout(): globalThis.Response {
  const clear = serialize(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clear } });
}


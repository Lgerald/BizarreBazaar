import type { Request, Response } from "express";
import { getFirebaseAuth, isFirebaseAdminConfigured } from "./firebaseAdmin";

export const SESSION_COOKIE_NAME = "bb_session";

const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type AuthUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

function cookieOptions(req: Request) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_EXPIRES_IN_MS,
  };
}

export async function verifyRequestSession(req: Request): Promise<AuthUser | null> {
  const cookie = (req as any).cookies?.[SESSION_COOKIE_NAME];
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

export async function handleSessionLogin(req: Request, res: Response) {
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

export async function handleSessionLogout(req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
}

export async function handleMe(req: Request, res: Response) {
  const user = await verifyRequestSession(req);
  if (!user) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user });
}


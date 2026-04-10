import type { Request, Response, NextFunction } from "express";
import { verifyRequestSession } from "./session";

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await verifyRequestSession(req);
  if (!user) return res.status(401).json({ ok: false, error: "unauthorized" });
  (req as any).user = user;
  return next();
}


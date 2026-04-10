import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client/client";
import { verifyRequestSession } from "../auth/session";

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/me", async (req, res) => {
    const firebaseUser = await verifyRequestSession(req);
    if (!firebaseUser) return res.status(401).json({ ok: false });

    const email = firebaseUser.email;
    const appUser = email ? await prisma.user.findUnique({ where: { email } }) : null;

    return res.json({
      ok: true,
      firebaseUser,
      appUser,
    });
  });

  return router;
}


import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client/client";

export function createUsersRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/users", async (_req, res) => {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
      return res.json({ ok: true, users });
    } catch (err) {
      console.error("GET /api/users failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.get("/users/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ ok: false, error: "user not found" });
      return res.json({ ok: true, user });
    } catch (err) {
      console.error("GET /api/users/:userId failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.post("/users", async (req, res) => {
    const firstName =
      typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName =
      typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        ok: false,
        error: "firstName, lastName, and email are required",
      });
    }

    try {
      const user = await prisma.user.create({ data: { firstName, lastName, email } });
      return res.status(201).json({ ok: true, user });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ ok: false, error: "email already exists" });
      }
      console.error("POST /api/users failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.patch("/users/:userId", async (req, res) => {
    const { userId } = req.params;

    const firstName =
      typeof req.body?.firstName === "string" ? req.body.firstName.trim() : undefined;
    const lastName =
      typeof req.body?.lastName === "string" ? req.body.lastName.trim() : undefined;
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : undefined;

    const data: { firstName?: string; lastName?: string; email?: string } = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Provide at least one field to update (firstName, lastName, email)",
      });
    }

    try {
      const user = await prisma.user.update({ where: { id: userId }, data });
      return res.json({ ok: true, user });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ ok: false, error: "email already exists" });
      }
      if (err?.code === "P2025") {
        return res.status(404).json({ ok: false, error: "user not found" });
      }
      console.error("PATCH /api/users/:userId failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  return router;
}


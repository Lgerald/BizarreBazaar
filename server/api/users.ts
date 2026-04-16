import { readJson, json } from "../http/httpUtil";
import type { ApiContext } from "./types";

export async function handleUsersApi(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, request, prisma } = ctx;

  if (pathname === "/api/users" && method === "GET") {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
      return json({ ok: true, users });
    } catch (err) {
      console.error("GET /api/users failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  if (pathname === "/api/users" && method === "POST") {
    const body = (await readJson(request)) ?? {};
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!firstName || !lastName || !email) {
      return json(
        { ok: false, error: "firstName, lastName, and email are required" },
        { status: 400 }
      );
    }

    try {
      const user = await prisma.user.create({ data: { firstName, lastName, email } });
      return json({ ok: true, user }, { status: 201 });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return json({ ok: false, error: "email already exists" }, { status: 409 });
      }
      console.error("POST /api/users failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  const userByIdMatch = /^\/api\/users\/([^/]+)$/.exec(pathname);
  if (!userByIdMatch) return null;

  const userId = userByIdMatch[1]!;

  if (method === "GET") {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return json({ ok: false, error: "user not found" }, { status: 404 });
      return json({ ok: true, user });
    } catch (err) {
      console.error("GET /api/users/:userId failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  if (method === "PATCH") {
    const body = (await readJson(request)) ?? {};
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;

    const data: { firstName?: string; lastName?: string; email?: string } = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;

    if (Object.keys(data).length === 0) {
      return json(
        {
          ok: false,
          error: "Provide at least one field to update (firstName, lastName, email)",
        },
        { status: 400 }
      );
    }

    try {
      const user = await prisma.user.update({ where: { id: userId }, data });
      return json({ ok: true, user });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return json({ ok: false, error: "email already exists" }, { status: 409 });
      }
      if (err?.code === "P2025") {
        return json({ ok: false, error: "user not found" }, { status: 404 });
      }
      console.error("PATCH /api/users/:userId failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  return null;
}

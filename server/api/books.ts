import { readJson, json } from "../http/httpUtil";
import type { ApiContext } from "./types";

export async function handleBooksApi(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, request, prisma, url } = ctx;

  if (pathname === "/api/books" && method === "GET") {
    const pageRaw = url.searchParams.get("page") ?? undefined;
    const limitRaw = url.searchParams.get("limit") ?? undefined;

    const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
    const requestedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;

    if (!Number.isFinite(page) || page < 1) {
      return json({ ok: false, error: "page must be a positive integer" }, { status: 400 });
    }

    try {
      const skip = (page - 1) * limit;
      const [total, books] = await Promise.all([
        prisma.book.count(),
        prisma.book.findMany({
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            owner: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);

      return json({
        ok: true,
        books: books.map((b: any) => ({
          ...b,
          ownerName: b.owner ? `${b.owner.firstName} ${b.owner.lastName}`.trim() : undefined,
        })),
        meta: {
          page,
          limit,
          total,
          hasMore: skip + books.length < total,
        },
      });
    } catch (err) {
      console.error("GET /api/books failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  if (pathname === "/api/books" && method === "POST") {
    const body = (await readJson(request)) ?? {};
    const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const urlVal = typeof body.url === "string" ? body.url.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : undefined;
    const description =
      typeof body.description === "string" ? body.description.trim() : undefined;

    if (!ownerId || !title || !urlVal) {
      return json({ ok: false, error: "ownerId, title, and url are required" }, { status: 400 });
    }

    try {
      const book = await prisma.book.create({
        data: {
          title,
          url: urlVal,
          ...(author ? { author } : {}),
          ...(description ? { description } : {}),
          owner: { connect: { id: ownerId } },
        },
      });
      return json({ ok: true, book }, { status: 201 });
    } catch (err: any) {
      if (err?.code === "P2003") {
        return json({ ok: false, error: "invalid ownerId" }, { status: 400 });
      }
      console.error("POST /api/books failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  const bookIdMatch = /^\/api\/books\/([^/]+)$/.exec(pathname);
  if (bookIdMatch && method === "PATCH") {
    const bookId = bookIdMatch[1]!;
    const body = (await readJson(request)) ?? {};

    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const urlVal = typeof body.url === "string" ? body.url.trim() : undefined;
    const author = typeof body.author === "string" ? body.author.trim() : undefined;
    const description =
      typeof body.description === "string" ? body.description.trim() : undefined;

    const authorValue = body.author === null ? null : author;
    const descriptionValue = body.description === null ? null : description;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (urlVal !== undefined) data.url = urlVal;
    if (authorValue !== undefined) data.author = authorValue;
    if (descriptionValue !== undefined) data.description = descriptionValue;

    if (Object.keys(data).length === 0) {
      return json(
        {
          ok: false,
          error: "Provide at least one field to update (title, url, author, description)",
        },
        { status: 400 }
      );
    }

    try {
      const book = await prisma.book.update({ where: { id: bookId }, data: data as any });
      return json({ ok: true, book });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return json({ ok: false, error: "book not found" }, { status: 404 });
      }
      console.error("PATCH /api/books/:bookId failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  const userBooksMatch = /^\/api\/users\/([^/]+)\/books$/.exec(pathname);
  if (userBooksMatch && method === "GET") {
    const userId = userBooksMatch[1]!;
    try {
      const books = await prisma.book.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { firstName: true, lastName: true } },
        },
      });
      return json({
        ok: true,
        books: books.map((b: any) => ({
          ...b,
          ownerName: b.owner ? `${b.owner.firstName} ${b.owner.lastName}`.trim() : undefined,
        })),
      });
    } catch (err) {
      console.error("GET /api/users/:userId/books failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  return null;
}

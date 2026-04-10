import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client/client";

export function createBooksRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/books", async (req, res) => {
    const pageRaw = typeof req.query.page === "string" ? req.query.page : undefined;
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit : undefined;

    const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
    const requestedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;

    if (!Number.isFinite(page) || page < 1) {
      return res
        .status(400)
        .json({ ok: false, error: "page must be a positive integer" });
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

      return res.json({
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
      return res.status(500).json({ ok: false });
    }
  });

  router.post("/books", async (req, res) => {
    const ownerId =
      typeof req.body?.ownerId === "string" ? req.body.ownerId.trim() : "";
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const author =
      typeof req.body?.author === "string" ? req.body.author.trim() : undefined;
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : undefined;

    if (!ownerId || !title || !url) {
      return res.status(400).json({
        ok: false,
        error: "ownerId, title, and url are required",
      });
    }

    try {
      const book = await prisma.book.create({
        data: {
          title,
          url,
          ...(author ? { author } : {}),
          ...(description ? { description } : {}),
          owner: { connect: { id: ownerId } },
        },
      });
      return res.status(201).json({ ok: true, book });
    } catch (err: any) {
      if (err?.code === "P2003") {
        return res.status(400).json({ ok: false, error: "invalid ownerId" });
      }
      console.error("POST /api/books failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.patch("/books/:bookId", async (req, res) => {
    const { bookId } = req.params;

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : undefined;
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : undefined;
    const author = typeof req.body?.author === "string" ? req.body.author.trim() : undefined;
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : undefined;

    const authorValue = req.body?.author === null ? null : author;
    const descriptionValue = req.body?.description === null ? null : description;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (url !== undefined) data.url = url;
    if (authorValue !== undefined) data.author = authorValue;
    if (descriptionValue !== undefined) data.description = descriptionValue;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Provide at least one field to update (title, url, author, description)",
      });
    }

    try {
      const book = await prisma.book.update({ where: { id: bookId }, data });
      return res.json({ ok: true, book });
    } catch (err: any) {
      if (err?.code === "P2025") {
        return res.status(404).json({ ok: false, error: "book not found" });
      }
      console.error("PATCH /api/books/:bookId failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.get("/users/:userId/books", async (req, res) => {
    const { userId } = req.params;
    try {
      const books = await prisma.book.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { firstName: true, lastName: true } },
        },
      });
      return res.json({
        ok: true,
        books: books.map((b: any) => ({
          ...b,
          ownerName: b.owner ? `${b.owner.firstName} ${b.owner.lastName}`.trim() : undefined,
        })),
      });
    } catch (err) {
      console.error("GET /api/users/:userId/books failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  return router;
}


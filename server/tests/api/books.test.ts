import request from "supertest";
import { describe, expect, it } from "vitest";
import { makeTestApp } from "../testApp";

describe("books API", () => {
  it("GET /api/books returns first page with meta", async () => {
    const prisma = {
      book: {
        count: async () => 2,
        findMany: async () => [
          { id: "b1", title: "T1", ownerId: "u1", owner: { firstName: "A", lastName: "One" } },
          { id: "b2", title: "T2", ownerId: "u2", owner: { firstName: "B", lastName: "Two" } },
        ],
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/books");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.books).toHaveLength(2);
    expect(res.body.books[0].id).toBe("b1");
    expect(res.body.books[0].ownerName).toBe("A One");
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      hasMore: false,
    });
  });

  it("GET /api/books paginates with page & limit", async () => {
    const prisma = {
      book: {
        count: async () => 3,
        findMany: async ({ skip, take }: any) => {
          expect(skip).toBe(1);
          expect(take).toBe(1);
          return [{ id: "b2", title: "T2", ownerId: "u1", owner: { firstName: "A", lastName: "One" } }];
        },
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/books?page=2&limit=1");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.books).toHaveLength(1);
    expect(res.body.books[0].ownerName).toBe("A One");
    expect(res.body.meta).toMatchObject({
      page: 2,
      limit: 1,
      total: 3,
      hasMore: true,
    });
  });

  it("POST /api/books creates a book", async () => {
    const prisma = {
      book: {
        create: async ({ data }: any) => ({
          id: "b1",
          ownerId: data.owner.connect.id,
          title: data.title,
          url: data.url,
          author: data.author ?? null,
          description: data.description ?? null,
        }),
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/books").send({
      ownerId: "u1",
      title: "My Book",
      url: "https://example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.book).toMatchObject({
      id: "b1",
      ownerId: "u1",
      title: "My Book",
      url: "https://example.com",
    });
  });

  it("POST /api/books returns 400 on invalid ownerId (FK)", async () => {
    const prisma = {
      book: {
        create: async () => {
          const err: any = new Error("fk");
          err.code = "P2003";
          throw err;
        },
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/books").send({
      ownerId: "nope",
      title: "X",
      url: "https://x.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("PATCH /api/books/:bookId updates fields and allows clearing nullable fields", async () => {
    const prisma = {
      book: {
        update: async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        }),
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).patch("/api/books/b1").send({
      title: "New",
      author: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.book).toMatchObject({ id: "b1", title: "New", author: null });
  });

  it("PATCH /api/books/:bookId returns 404 when book not found", async () => {
    const prisma = {
      book: {
        update: async () => {
          const err: any = new Error("not found");
          err.code = "P2025";
          throw err;
        },
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).patch("/api/books/missing").send({
      title: "X",
    });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it("GET /api/users/:userId/books returns list", async () => {
    const prisma = {
      book: {
        findMany: async ({ where }: any) => [
          {
            id: "b1",
            ownerId: where.ownerId,
            title: "T1",
            owner: { firstName: "A", lastName: "One" },
          },
          {
            id: "b2",
            ownerId: where.ownerId,
            title: "T2",
            owner: { firstName: "A", lastName: "One" },
          },
        ],
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/users/u1/books");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.books).toHaveLength(2);
    expect(res.body.books[0].ownerId).toBe("u1");
    expect(res.body.books[0].ownerName).toBe("A One");
  });
});


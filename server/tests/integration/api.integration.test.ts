import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client/client";
import { makeTestApp } from "../testApp";
import { prismaMigrateDeploy, startPostgresForTests } from "./helpers/postgres";

let stop: (() => Promise<void>) | undefined;
let prisma: PrismaClient | undefined;
let app: ReturnType<typeof makeTestApp> | undefined;

beforeAll(async () => {
  // If Docker isn’t running, these tests should be skipped.
  let started;
  try {
    started = await startPostgresForTests();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Skipping integration tests (Postgres container failed to start):", err);
    return;
  }

  stop = started.stop;
  prismaMigrateDeploy(started.databaseUrl);

  const adapter = new PrismaPg({ connectionString: started.databaseUrl });
  prisma = new PrismaClient({ adapter });
  app = makeTestApp(prisma as any);
});

afterAll(async () => {
  await prisma?.$disconnect();
  if (stop) await stop();
});

describe("integration: users + books APIs", () => {
  it("creates a user, creates a book, lists books for that user", async () => {
    if (!app) return; // skipped

    const createUser = await request(app).post("/api/users").send({
      firstName: "Integration",
      lastName: "Test",
      email: `it-${Date.now()}@example.com`,
    });
    expect(createUser.status).toBe(201);

    const userId = createUser.body.user.id;

    const createBook = await request(app).post("/api/books").send({
      ownerId: userId,
      title: "Book 1",
      url: "https://example.com/book-1",
      author: "Someone",
    });
    expect(createBook.status).toBe(201);

    const listAll = await request(app).get(`/api/books?limit=1&page=1`);
    expect(listAll.status).toBe(200);
    expect(listAll.body.ok).toBe(true);
    expect(listAll.body.books.length).toBe(1);
    expect(listAll.body.meta).toMatchObject({
      page: 1,
      limit: 1,
    });

    const listBooks = await request(app).get(`/api/users/${userId}/books`);
    expect(listBooks.status).toBe(200);
    expect(listBooks.body.ok).toBe(true);
    expect(listBooks.body.books.length).toBe(1);
    expect(listBooks.body.books[0]).toMatchObject({
      ownerId: userId,
      title: "Book 1",
    });
  });
});


import request from "supertest";
import { describe, expect, it } from "vitest";
import { makeTestApp } from "../testApp";

describe("users API", () => {
  it("POST /api/users creates a user", async () => {
    const prisma = {
      user: {
        create: async ({ data }: any) => ({ id: "u1", ...data }),
      },
    };

    const app = makeTestApp(prisma);
    const res = await request(app).post("/api/users").send({
      firstName: "Leah",
      lastName: "Gerald",
      email: "Leah@Example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toMatchObject({
      id: "u1",
      firstName: "Leah",
      lastName: "Gerald",
      email: "leah@example.com",
    });
  });

  it("POST /api/users returns 400 on missing fields", async () => {
    const prisma = { user: { create: async () => ({}) } };
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/users").send({ email: "x@y.com" });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/users returns 409 on duplicate email", async () => {
    const prisma = {
      user: {
        create: async () => {
          const err: any = new Error("dup");
          err.code = "P2002";
          throw err;
        },
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/users").send({
      firstName: "A",
      lastName: "B",
      email: "dup@example.com",
    });
    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
  });

  it("PATCH /api/users/:userId updates user fields", async () => {
    const prisma = {
      user: {
        update: async ({ where, data }: any) => ({ id: where.id, ...data }),
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).patch("/api/users/u1").send({
      firstName: "New",
      email: "NEW@EXAMPLE.COM",
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toMatchObject({
      id: "u1",
      firstName: "New",
      email: "new@example.com",
    });
  });

  it("PATCH /api/users/:userId returns 404 when user not found", async () => {
    const prisma = {
      user: {
        update: async () => {
          const err: any = new Error("not found");
          err.code = "P2025";
          throw err;
        },
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app)
      .patch("/api/users/does-not-exist")
      .send({ firstName: "X" });
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});


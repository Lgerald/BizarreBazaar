import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { makeTestApp } from "../testApp";

vi.mock("../../auth/session", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../auth/session")>();
  return {
    ...mod,
    verifyWebRequestSession: vi.fn(),
  };
});

import * as session from "../../auth/session";

describe("auth API", () => {
  it("GET /api/me returns 401 when not authenticated", async () => {
    (session.verifyWebRequestSession as any).mockResolvedValueOnce(null);

    const prisma = {
      user: { findUnique: vi.fn() },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false });
  });

  it("GET /api/me returns firebaseUser + appUser (or null)", async () => {
    (session.verifyWebRequestSession as any).mockResolvedValueOnce({
      uid: "fb_123",
      email: "leah@example.com",
      name: "Leah Gerald",
    });

    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValueOnce({
          id: "u1",
          firstName: "Leah",
          lastName: "Gerald",
          email: "leah@example.com",
        }),
      },
    };
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/me");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.firebaseUser.email).toBe("leah@example.com");
    expect(res.body.appUser.email).toBe("leah@example.com");
  });
});


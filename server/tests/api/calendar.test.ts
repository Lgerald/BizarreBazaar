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

vi.mock("../../integrations/googleCalendar", () => {
  return {
    buildOAuthConsentUrl: () => "https://example.com/oauth",
    exchangeCodeForTokens: vi.fn(async (code: string) => ({ refresh_token: `rt_${code}` })),
    getCalendarId: () => "cal_123",
    makeCalendarClient: () => ({
      events: {
        list: vi.fn(async () => ({ data: { items: [{ id: "e1", summary: "S" }] } })),
        insert: vi.fn(async () => ({ data: { id: "e_new", summary: "X" } })),
        patch: vi.fn(async () => ({ data: { id: "e1", summary: "Updated" } })),
        delete: vi.fn(async () => ({ data: {} })),
      },
    }),
  };
});

import * as session from "../../auth/session";
import * as gcal from "../../integrations/googleCalendar";

describe("calendar API", () => {
  it("requires auth", async () => {
    (session.verifyWebRequestSession as any).mockResolvedValueOnce(null);
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/calendar/events");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("GET /api/calendar/oauth/url returns consent URL", async () => {
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/calendar/oauth/url");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, url: "https://example.com/oauth" });
  });

  it("POST /api/calendar/oauth/exchange returns tokens", async () => {
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/calendar/oauth/exchange").send({ code: "abc" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.tokens.refresh_token).toBe("rt_abc");
    expect((gcal.exchangeCodeForTokens as any)).toHaveBeenCalledWith("abc");
  });

  it("GET /api/calendar/events returns events from Google", async () => {
    (session.verifyWebRequestSession as any).mockResolvedValueOnce({ uid: "u", email: "x@y.com" });
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/calendar/events");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.events[0].id).toBe("e1");
  });

  it("POST /api/calendar/events creates google event and persists record", async () => {
    (session.verifyWebRequestSession as any).mockResolvedValueOnce({ uid: "u", email: "leah@example.com" });
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/calendar/events").send({
      summary: "Meet",
      startAt: new Date("2030-01-01T10:00:00.000Z").toISOString(),
      endAt: new Date("2030-01-01T11:00:00.000Z").toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.event.id).toBe("e_new");
  });
});


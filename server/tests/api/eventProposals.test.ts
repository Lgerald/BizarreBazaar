import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { makeTestApp } from "../testApp";

vi.mock("../../auth/session", () => {
  return {
    verifyRequestSession: vi.fn(),
  };
});

vi.mock("../../integrations/googleCalendar", () => {
  const store: any = {
    events: {
      e1: {
        id: "e1",
        summary: "Proposed",
        attendees: [{ email: "a@example.com" }],
        extendedProperties: { private: { bb_status: "proposed", bb_proposedBy: "p@example.com" } },
      },
    },
  };

  return {
    getCalendarId: () => "cal_123",
    makeCalendarClient: () => ({
      events: {
        list: vi.fn(async () => ({ data: { items: [store.events.e1] } })),
        get: vi.fn(async ({ eventId }: any) => ({ data: store.events[eventId] ?? null })),
        patch: vi.fn(async ({ eventId, requestBody }: any) => {
          store.events[eventId] = { ...(store.events[eventId] ?? {}), ...requestBody };
          return { data: store.events[eventId] };
        }),
        insert: vi.fn(async ({ requestBody }: any) => {
          store.events.e2 = { id: "e2", ...requestBody };
          return { data: store.events.e2 };
        }),
      },
    }),
  };
});

import * as session from "../../auth/session";

describe("event proposals API (gcal-only)", () => {
  it("requires auth", async () => {
    (session.verifyRequestSession as any).mockResolvedValueOnce(null);
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/event-proposals");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it("GET /api/event-proposals returns proposed events", async () => {
    (session.verifyRequestSession as any).mockResolvedValueOnce({
      uid: "fb1",
      email: "a@example.com",
    });
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).get("/api/event-proposals");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.proposals[0].event.id).toBe("e1");
    expect(res.body.proposals[0].joined).toBe(true);
  });

  it("POST /api/event-proposals creates a proposed event", async () => {
    (session.verifyRequestSession as any).mockResolvedValueOnce({
      uid: "fb1",
      email: "leah@example.com",
    });
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/event-proposals").send({
      summary: "Test proposal",
      startAt: new Date("2030-01-01T10:00:00.000Z").toISOString(),
      endAt: new Date("2030-01-01T11:00:00.000Z").toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.event.extendedProperties.private.bb_status).toBe("proposed");
  });

  it("POST /api/event-proposals/:eventId/join adds attendee", async () => {
    (session.verifyRequestSession as any).mockResolvedValueOnce({
      uid: "fb1",
      email: "new@example.com",
    });
    const prisma = {};
    const app = makeTestApp(prisma);

    const res = await request(app).post("/api/event-proposals/e1/join");
    expect([200, 201]).toContain(res.status);
    expect(res.body.ok).toBe(true);
  });
});


import { Router } from "express";
import type { PrismaClient } from "../../generated/prisma/client/client";
import { requireUser } from "../auth/requireUser";
import { getCalendarId, makeCalendarClient } from "../integrations/googleCalendar";

function isIsoDateTimeString(v: unknown): v is string {
  return typeof v === "string" && Number.isFinite(Date.parse(v));
}

export function createEventProposalsRouter(prisma: PrismaClient) {
  const router = Router();

  router.get("/event-proposals", requireUser, async (req, res) => {
    try {
      const meEmail = (req as any).user?.email as string | undefined;
      if (!meEmail) return res.status(400).json({ ok: false, error: "missing user email" });

      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const { data } = await calendar.events.list({
        calendarId,
        singleEvents: true,
        orderBy: "startTime",
        privateExtendedProperty: "bb_status=proposed",
        timeMin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        maxResults: 250,
      } as any);

      const items = data.items ?? [];
      return res.json({
        ok: true,
        proposals: items.map((e: any) => {
          const attendees = Array.isArray(e.attendees) ? e.attendees : [];
          const joined = attendees.some(
            (a: any) =>
              typeof a?.email === "string" && a.email.toLowerCase() === meEmail.toLowerCase()
          );
          return {
            event: e,
            attendeeCount: attendees.length,
            joined,
            status: e.extendedProperties?.private?.bb_status ?? "proposed",
            proposedBy: e.extendedProperties?.private?.bb_proposedBy ?? null,
          };
        }),
      });
    } catch (err) {
      console.error("GET /api/event-proposals failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.post("/event-proposals", requireUser, async (req, res) => {
    const summary = typeof req.body?.summary === "string" ? req.body.summary.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : undefined;
    const location =
      typeof req.body?.location === "string" ? req.body.location.trim() : undefined;

    const startAtRaw = req.body?.startAt;
    const endAtRaw = req.body?.endAt;
    const timeZone =
      typeof req.body?.timeZone === "string" ? req.body.timeZone.trim() : undefined;

    if (!summary) return res.status(400).json({ ok: false, error: "summary required" });
    if (!isIsoDateTimeString(startAtRaw) || !isIsoDateTimeString(endAtRaw)) {
      return res
        .status(400)
        .json({ ok: false, error: "startAt and endAt must be ISO datetime strings" });
    }

    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);
    if (!(endAt.getTime() > startAt.getTime())) {
      return res.status(400).json({ ok: false, error: "endAt must be after startAt" });
    }

    try {
      const meEmail = (req as any).user?.email as string | undefined;
      if (!meEmail) return res.status(400).json({ ok: false, error: "missing user email" });

      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const insertRes = await calendar.events.insert({
        calendarId,
        sendUpdates: "none",
        requestBody: {
          summary,
          ...(description ? { description } : {}),
          ...(location ? { location } : {}),
          start: { dateTime: startAt.toISOString(), ...(timeZone ? { timeZone } : {}) },
          end: { dateTime: endAt.toISOString(), ...(timeZone ? { timeZone } : {}) },
          ...(timeZone ? { timeZone } : {}),
          extendedProperties: {
            private: {
              bb_status: "proposed",
              bb_proposedBy: meEmail,
            },
          },
        },
      } as any);

      return res.status(201).json({ ok: true, event: insertRes.data });
    } catch (err) {
      console.error("POST /api/event-proposals failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.post("/event-proposals/:eventId/join", requireUser, async (req, res) => {
    const { eventId } = req.params;
    try {
      const meEmail = (req as any).user?.email as string | undefined;
      if (!meEmail) return res.status(400).json({ ok: false, error: "missing user email" });

      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const existing = await calendar.events.get({ calendarId, eventId } as any);
      const e: any = existing.data;
      if (!e?.id) return res.status(404).json({ ok: false, error: "event not found" });

      const attendees = Array.isArray(e.attendees) ? [...e.attendees] : [];
      const already = attendees.some(
        (a: any) =>
          typeof a?.email === "string" && a.email.toLowerCase() === meEmail.toLowerCase()
      );

      if (!already) attendees.push({ email: meEmail });

      const patched = await calendar.events.patch({
        calendarId,
        eventId,
        sendUpdates: "none",
        requestBody: { attendees },
      } as any);

      return res.status(already ? 200 : 201).json({
        ok: true,
        alreadyJoined: already ? true : undefined,
        event: patched.data,
      });
    } catch (err) {
      console.error("POST /api/event-proposals/:eventId/join failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  return router;
}


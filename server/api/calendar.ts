import { Router } from "express";
import { requireUser } from "../auth/requireUser";
import {
  buildOAuthConsentUrl,
  exchangeCodeForTokens,
  getCalendarId,
  makeCalendarClient,
} from "../integrations/googleCalendar";

function isIsoDateTimeString(v: unknown): v is string {
  return typeof v === "string" && Number.isFinite(Date.parse(v));
}

function allowSetup(req: any): boolean {
  const setupKey = process.env.GCAL_SETUP_KEY;
  if (!setupKey) return true; // personal-project default: no extra gate

  const provided =
    (typeof req.query?.setupKey === "string" ? req.query.setupKey : undefined) ??
    (typeof req.body?.setupKey === "string" ? req.body.setupKey : undefined);

  return Boolean(provided) && provided === setupKey;
}

export function createCalendarRouter(_prisma: any) {
  const router = Router();

  // Bootstrap helpers (personal project ergonomics)
  router.get("/calendar/oauth/url", async (req, res) => {
    try {
      if (!allowSetup(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }
      return res.json({ ok: true, url: buildOAuthConsentUrl() });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message ?? "failed" });
    }
  });

  router.get("/calendar/oauth/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
    const error = typeof req.query.error === "string" ? req.query.error.trim() : "";

    if (error) {
      return res
        .status(400)
        .type("html")
        .send(`<pre>OAuth error: ${escapeHtml(error)}</pre>`);
    }

    if (!code) {
      return res
        .status(400)
        .type("html")
        .send(`<pre>Missing code. Query params: ${escapeHtml(JSON.stringify(req.query ?? {}))}</pre>`);
    }

    return res.type("html").send(`<pre>Copy this code:\n\n${escapeHtml(code)}\n</pre>`);
  });

  router.post("/calendar/oauth/exchange", async (req, res) => {
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!code) return res.status(400).json({ ok: false, error: "code required" });

    try {
      if (!allowSetup(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }
      const tokens = await exchangeCodeForTokens(code);
      // We return tokens so you can copy `refresh_token` into env locally.
      return res.json({ ok: true, tokens });
    } catch (err: any) {
      console.error("POST /api/calendar/oauth/exchange failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.get("/calendar/events", requireUser, async (req, res) => {
    const timeMinRaw =
      typeof req.query.timeMin === "string" ? req.query.timeMin : undefined;
    const timeMaxRaw =
      typeof req.query.timeMax === "string" ? req.query.timeMax : undefined;

    const timeMin = timeMinRaw && isIsoDateTimeString(timeMinRaw) ? timeMinRaw : undefined;
    const timeMax = timeMaxRaw && isIsoDateTimeString(timeMaxRaw) ? timeMaxRaw : undefined;

    try {
      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const { data } = await calendar.events.list({
        calendarId,
        singleEvents: true,
        orderBy: "startTime",
        timeMin: timeMin ?? new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        ...(timeMax ? { timeMax } : {}),
        maxResults: 250,
      });

      const items = data.items ?? [];
      return res.json({ ok: true, events: items });
    } catch (err) {
      console.error("GET /api/calendar/events failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.post("/calendar/events", requireUser, async (req, res) => {
    const summary =
      typeof req.body?.summary === "string" ? req.body.summary.trim() : "";
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
      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const insertRes = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary,
          ...(description ? { description } : {}),
          ...(location ? { location } : {}),
          start: { dateTime: startAt.toISOString(), ...(timeZone ? { timeZone } : {}) },
          end: { dateTime: endAt.toISOString(), ...(timeZone ? { timeZone } : {}) },
        },
      });

      const googleEvent = insertRes.data;
      if (!googleEvent.id) return res.status(500).json({ ok: false, error: "missing event id" });
      return res.status(201).json({ ok: true, event: googleEvent });
    } catch (err) {
      console.error("POST /api/calendar/events failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.patch("/calendar/events/:id", requireUser, async (req, res) => {
    const { id } = req.params;
    const summary =
      typeof req.body?.summary === "string" ? req.body.summary.trim() : undefined;
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : undefined;
    const location =
      typeof req.body?.location === "string" ? req.body.location.trim() : undefined;

    const startAtRaw = req.body?.startAt;
    const endAtRaw = req.body?.endAt;
    const timeZone =
      typeof req.body?.timeZone === "string" ? req.body.timeZone.trim() : undefined;

    const startAt = startAtRaw === undefined ? undefined : isIsoDateTimeString(startAtRaw) ? new Date(startAtRaw) : null;
    const endAt = endAtRaw === undefined ? undefined : isIsoDateTimeString(endAtRaw) ? new Date(endAtRaw) : null;

    if (startAt === null || endAt === null) {
      return res
        .status(400)
        .json({ ok: false, error: "startAt/endAt must be ISO datetime strings when provided" });
    }

    if (startAt && endAt && !(endAt.getTime() > startAt.getTime())) {
      return res.status(400).json({ ok: false, error: "endAt must be after startAt" });
    }

    if (
      summary === undefined &&
      description === undefined &&
      location === undefined &&
      startAt === undefined &&
      endAt === undefined &&
      timeZone === undefined
    ) {
      return res.status(400).json({ ok: false, error: "Provide at least one field to update" });
    }

    try {
      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const patchRes = await calendar.events.patch({
        calendarId,
        eventId: id,
        requestBody: {
          ...(summary !== undefined ? { summary } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(location !== undefined ? { location } : {}),
          ...(startAt !== undefined
            ? { start: { dateTime: startAt.toISOString(), ...(timeZone ? { timeZone } : {}) } }
            : {}),
          ...(endAt !== undefined
            ? { end: { dateTime: endAt.toISOString(), ...(timeZone ? { timeZone } : {}) } }
            : {}),
        },
      } as any);

      return res.json({ ok: true, event: patchRes.data });
    } catch (err) {
      console.error("PATCH /api/calendar/events/:id failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  router.delete("/calendar/events/:id", requireUser, async (req, res) => {
    const { id } = req.params;
    try {
      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      await calendar.events.delete({ calendarId, eventId: id } as any);

      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/calendar/events/:id failed", err);
      return res.status(500).json({ ok: false });
    }
  });

  return router;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


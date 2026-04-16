import {
  buildOAuthConsentUrl,
  exchangeCodeForTokens,
  getCalendarId,
  makeCalendarClient,
} from "../integrations/googleCalendar";
import { readJson, json, escapeHtml, isIsoDateTimeString } from "../http/httpUtil";
import { requireUserOr401 } from "../http/requireAuth";
import { allowCalendarSetup } from "./calendarSetup";
import type { ApiContext } from "./types";

export async function handleCalendarApi(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, request, url } = ctx;

  if (pathname === "/api/calendar/oauth/url" && method === "GET") {
    try {
      if (!allowCalendarSetup(request, null)) {
        return json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      return json({ ok: true, url: buildOAuthConsentUrl() });
    } catch (err: any) {
      return json({ ok: false, error: err?.message ?? "failed" }, { status: 500 });
    }
  }

  if (pathname === "/api/calendar/oauth/callback" && method === "GET") {
    const code = url.searchParams.get("code")?.trim() ?? "";
    const error = url.searchParams.get("error")?.trim() ?? "";

    if (error) {
      return new Response(`<pre>OAuth error: ${escapeHtml(error)}</pre>`, {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!code) {
      return new Response(
        `<pre>Missing code. Query params: ${escapeHtml(JSON.stringify(Object.fromEntries(url.searchParams)))}</pre>`,
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response(`<pre>Copy this code:\n\n${escapeHtml(code)}\n</pre>`, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (pathname === "/api/calendar/oauth/exchange" && method === "POST") {
    const body = (await readJson(request)) ?? {};
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return json({ ok: false, error: "code required" }, { status: 400 });

    try {
      if (!allowCalendarSetup(request, body)) {
        return json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      const tokens = await exchangeCodeForTokens(code);
      return json({ ok: true, tokens });
    } catch (err) {
      console.error("POST /api/calendar/oauth/exchange failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  if (pathname === "/api/calendar/events" && method === "GET") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;

    const timeMinRaw = url.searchParams.get("timeMin") ?? undefined;
    const timeMaxRaw = url.searchParams.get("timeMax") ?? undefined;

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
      return json({ ok: true, events: items });
    } catch (err) {
      console.error("GET /api/calendar/events failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  if (pathname === "/api/calendar/events" && method === "POST") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;

    const body = (await readJson(request)) ?? {};
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : undefined;
    const location = typeof body.location === "string" ? body.location.trim() : undefined;

    const startAtRaw = body.startAt;
    const endAtRaw = body.endAt;
    const timeZone = typeof body.timeZone === "string" ? body.timeZone.trim() : undefined;

    if (!summary) return json({ ok: false, error: "summary required" }, { status: 400 });
    if (!isIsoDateTimeString(startAtRaw) || !isIsoDateTimeString(endAtRaw)) {
      return json(
        { ok: false, error: "startAt and endAt must be ISO datetime strings" },
        { status: 400 }
      );
    }

    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);
    if (!(endAt.getTime() > startAt.getTime())) {
      return json({ ok: false, error: "endAt must be after startAt" }, { status: 400 });
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
      if (!googleEvent?.id) return json({ ok: false, error: "missing event id" }, { status: 500 });
      return json({ ok: true, event: googleEvent }, { status: 201 });
    } catch (err) {
      console.error("POST /api/calendar/events failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  const calEventIdMatch = /^\/api\/calendar\/events\/([^/]+)$/.exec(pathname);
  if (calEventIdMatch && method === "PATCH") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;

    const id = calEventIdMatch[1]!;
    const body = (await readJson(request)) ?? {};
    const summary = typeof body.summary === "string" ? body.summary.trim() : undefined;
    const description =
      typeof body.description === "string" ? body.description.trim() : undefined;
    const location = typeof body.location === "string" ? body.location.trim() : undefined;

    const startAtRaw = body.startAt;
    const endAtRaw = body.endAt;
    const timeZone = typeof body.timeZone === "string" ? body.timeZone.trim() : undefined;

    const startAt =
      startAtRaw === undefined
        ? undefined
        : isIsoDateTimeString(startAtRaw)
          ? new Date(startAtRaw)
          : null;
    const endAt =
      endAtRaw === undefined ? undefined : isIsoDateTimeString(endAtRaw) ? new Date(endAtRaw) : null;

    if (startAt === null || endAt === null) {
      return json(
        { ok: false, error: "startAt/endAt must be ISO datetime strings when provided" },
        { status: 400 }
      );
    }

    if (startAt && endAt && !(endAt.getTime() > startAt.getTime())) {
      return json({ ok: false, error: "endAt must be after startAt" }, { status: 400 });
    }

    if (
      summary === undefined &&
      description === undefined &&
      location === undefined &&
      startAt === undefined &&
      endAt === undefined &&
      timeZone === undefined
    ) {
      return json({ ok: false, error: "Provide at least one field to update" }, { status: 400 });
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

      return json({ ok: true, event: patchRes.data });
    } catch (err) {
      console.error("PATCH /api/calendar/events/:id failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  if (calEventIdMatch && method === "DELETE") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;

    const id = calEventIdMatch[1]!;
    try {
      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      await calendar.events.delete({ calendarId, eventId: id } as any);

      return json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/calendar/events/:id failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  return null;
}

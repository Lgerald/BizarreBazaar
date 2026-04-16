import {
  getCalendarId,
  makeCalendarClient,
} from "../integrations/googleCalendar";
import { readJson, json, isIsoDateTimeString } from "../http/httpUtil";
import { requireUserOr401 } from "../http/requireAuth";
import type { ApiContext } from "./types";

export async function handleEventProposalsApi(ctx: ApiContext): Promise<Response | null> {
  const { pathname, method, request } = ctx;

  if (pathname === "/api/event-proposals" && method === "GET") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;
    const meEmail = auth.email;

    try {
      if (!meEmail) return json({ ok: false, error: "missing user email" }, { status: 400 });

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
      return json({
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
      return json({ ok: false }, { status: 500 });
    }
  }

  if (pathname === "/api/event-proposals" && method === "POST") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;
    const meEmail = auth.email;

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
      if (!meEmail) return json({ ok: false, error: "missing user email" }, { status: 400 });

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

      return json({ ok: true, event: insertRes.data }, { status: 201 });
    } catch (err) {
      console.error("POST /api/event-proposals failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  const proposalJoinMatch = /^\/api\/event-proposals\/([^/]+)\/join$/.exec(pathname);
  if (proposalJoinMatch && method === "POST") {
    const auth = await requireUserOr401(request);
    if (auth instanceof Response) return auth;
    const meEmail = auth.email;
    const eventId = proposalJoinMatch[1]!;

    try {
      if (!meEmail) return json({ ok: false, error: "missing user email" }, { status: 400 });

      const calendar = makeCalendarClient();
      const calendarId = getCalendarId();

      const existing = await calendar.events.get({ calendarId, eventId } as any);
      const e: any = existing.data;
      if (!e?.id) return json({ ok: false, error: "event not found" }, { status: 404 });

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

      return json(
        {
          ok: true,
          alreadyJoined: already ? true : undefined,
          event: patched.data,
        },
        already ? { status: 200 } : { status: 201 }
      );
    } catch (err) {
      console.error("POST /api/event-proposals/:eventId/join failed", err);
      return json({ ok: false }, { status: 500 });
    }
  }

  return null;
}

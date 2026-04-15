import type { Route } from "./+types/calendar";
import { redirect, useActionData, useLoaderData } from "react-router";

import { CalendarView } from "~/Views/Calendar/CalendarView";
import type { GoogleCalendarEvent } from "~/Views/Calendar/types";

type ActionData = { ok: true } | { ok: false; error: string };

function parseLocalDateTimeToIso(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  // Accept either a datetime-local string or full ISO.
  // Note: `datetime-local` comes as "YYYY-MM-DDTHH:mm" (no timezone). JS parses it as local time.
  const d = new Date(trimmed);
  if (Number.isFinite(d.getTime())) return d.toISOString();
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const summary = String(formData.get("summary") ?? "").trim();
  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!summary) return { ok: false, error: "summary is required" } satisfies ActionData;

  const startAt = parseLocalDateTimeToIso(startAtRaw);
  const endAt = parseLocalDateTimeToIso(endAtRaw);
  if (!startAt || !endAt) {
    return { ok: false, error: "start and end are required" } satisfies ActionData;
  }

  const origin = new URL(request.url).origin;
  const cookie = request.headers.get("cookie");
  const res = await fetch(`${origin}/api/calendar/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({
      summary,
      startAt,
      endAt,
      ...(location ? { location } : {}),
      ...(description ? { description } : {}),
    }),
  });

  if (res.status === 401) return { ok: false, error: "unauthorized" } satisfies ActionData;
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    return { ok: false, error: j?.error ?? "failed to create event" } satisfies ActionData;
  }

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) return redirect("/calendar");
  return { ok: true } satisfies ActionData;
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const embedUrl =
    typeof process !== "undefined" && process.env
      ? ((process.env.PUBLIC_GCAL_EMBED_URL ??
          process.env.GCAL_EMBED_URL ??
          process.env.VITE_PUBLIC_GCAL_EMBED_URL ??
          "") as string)
          .trim() || null
      : null;
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + 60);

  const url = new URL(`${origin}/api/calendar/events`);
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());

  const cookie = request.headers.get("cookie");
  const res = await fetch(url.toString(), {
    headers: cookie ? { cookie } : undefined,
  });

  if (res.status === 401) {
    return { events: [] as GoogleCalendarEvent[], unauthorized: true as const, embedUrl };
  }
  if (!res.ok) throw new Response("Failed to load calendar events", { status: 500 });

  const json = await res.json();
  return {
    events: (json.events ?? []) as GoogleCalendarEvent[],
    unauthorized: false as const,
    embedUrl,
  };
}

export default function CalendarRoute() {
  const { events, unauthorized, embedUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <CalendarView
      events={events as GoogleCalendarEvent[]}
      unauthorized={unauthorized}
      embedUrl={embedUrl ?? null}
      createEventError={actionData && actionData.ok === false ? actionData.error : null}
    />
  );
}


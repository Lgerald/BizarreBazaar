import type { Route } from "./+types/calendar";
import { useLoaderData } from "react-router";

type GoogleCalendarEvent = {
  id?: string | null;
  htmlLink?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
};

function toDateKey(d: Date) {
  // yyyy-mm-dd in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseEventStart(e: GoogleCalendarEvent): Date | null {
  const dt = e.start?.dateTime ?? null;
  const d = e.start?.date ?? null;
  if (dt) return new Date(dt);
  if (d) return new Date(`${d}T00:00:00`);
  return null;
}

function parseEventEnd(e: GoogleCalendarEvent): Date | null {
  const dt = e.end?.dateTime ?? null;
  const d = e.end?.date ?? null;
  if (dt) return new Date(dt);
  if (d) return new Date(`${d}T00:00:00`);
  return null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
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
    return { events: [] as GoogleCalendarEvent[], unauthorized: true as const };
  }
  if (!res.ok) throw new Response("Failed to load calendar events", { status: 500 });

  const json = await res.json();
  return { events: (json.events ?? []) as GoogleCalendarEvent[], unauthorized: false as const };
}

export default function CalendarRoute() {
  const { events, unauthorized } = useLoaderData<typeof loader>();

  const enriched = events
    .map((e) => {
      const start = parseEventStart(e);
      const end = parseEventEnd(e);
      return { e, start, end };
    })
    .filter((x) => x.start && Number.isFinite(x.start.getTime()))
    .sort((a, b) => a.start!.getTime() - b.start!.getTime());

  const grouped = new Map<string, typeof enriched>();
  for (const item of enriched) {
    const k = toDateKey(item.start!);
    const arr = grouped.get(k) ?? [];
    arr.push(item);
    grouped.set(k, arr);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Calendar</h1>
        <div style={{ opacity: 0.75 }}>
          Showing events from the last 7 days through the next 60 days
        </div>
      </div>

      {unauthorized ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Sign in required</div>
          <div style={{ opacity: 0.8 }}>
            This calendar is tied to your account session. Please sign in from the sidebar, then
            come back.
          </div>
        </div>
      ) : null}

      {!unauthorized && grouped.size === 0 ? (
        <div style={{ opacity: 0.8 }}>No upcoming events in this window.</div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {Array.from(grouped.entries()).map(([day, items]) => (
          <section
            key={day}
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              background: "white",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 800 }}>{day}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map(({ e, start, end }) => (
                <div
                  key={e.id ?? `${day}_${e.summary ?? "event"}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 10,
                    alignItems: "baseline",
                  }}
                >
                  <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {start ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    {end
                      ? `–${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>
                      {e.htmlLink ? (
                        <a href={e.htmlLink} target="_blank" rel="noreferrer">
                          {e.summary ?? "(no title)"}
                        </a>
                      ) : (
                        e.summary ?? "(no title)"
                      )}
                    </div>
                    {e.location ? <div style={{ opacity: 0.75 }}>{e.location}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}


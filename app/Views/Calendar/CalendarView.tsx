import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import type { GoogleCalendarEvent } from "./types";
import { parseEventEnd, parseEventStart, toDateKey } from "./date";
import { CreateEventForm } from "./CreateEventForm";

export function CalendarView({
  events,
  unauthorized,
  embedUrl,
  createEventError,
}: {
  events: GoogleCalendarEvent[];
  unauthorized: boolean;
  embedUrl: string | null;
  createEventError?: string | null;
}) {
  const revalidator = useRevalidator();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [iframeRefreshNonce, setIframeRefreshNonce] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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

  const iframeSrc = (() => {
    if (!embedUrl) return null;
    try {
      const u = new URL(embedUrl);
      // Cache-buster so the embed reloads after we create an event.
      u.searchParams.set("bbts", String(iframeRefreshNonce));
      return u.toString();
    } catch {
      // If it's not a valid URL, just use the raw value.
      return embedUrl;
    }
  })();

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Bizarre Bazaar Bookings</h1>
        <div style={{ marginLeft: "auto", position: "relative" }} ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              padding: "10px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Actions
          </button>

          {menuOpen ? (
            <div
              role="menu"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 220,
                padding: 8,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "white",
                boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
                display: "grid",
                gap: 6,
                zIndex: 20,
              }}
            >
              <button
                type="button"
                role="menuitem"
                disabled={unauthorized}
                onClick={() => {
                  setMenuOpen(false);
                  setCreateOpen(true);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: unauthorized ? "#f3f4f6" : "white",
                  cursor: unauthorized ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                New event
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {createOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create calendar event"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "min(640px, 100%)",
              borderRadius: 16,
              background: "white",
              border: "1px solid #e5e7eb",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Create event</div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                style={{
                  marginLeft: "auto",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ×
              </button>
            </div>

            <CreateEventForm
              unauthorized={unauthorized}
              error={createEventError ?? null}
              onSuccess={() => {
                setCreateOpen(false);
                setMenuOpen(false);
                revalidator.revalidate();
                setIframeRefreshNonce((n) => n + 1);
              }}
            />
          </div>
        </div>
      ) : null}

      {iframeSrc ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            background: "white",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 12,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: 800 }}>Google Calendar</div>
            <a href={embedUrl ?? undefined} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
              Open in new tab
            </a>
          </div>
          <iframe
            title="Google Calendar"
            src={iframeSrc}
            style={{ width: "100%", height: 760, border: 0, display: "block" }}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </section>
      ) : null}

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
                    {start
                      ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
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


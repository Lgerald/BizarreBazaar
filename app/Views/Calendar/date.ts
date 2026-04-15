import type { GoogleCalendarEvent } from "./types";

export function toDateKey(d: Date) {
  // yyyy-mm-dd in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseEventStart(e: GoogleCalendarEvent): Date | null {
  const dt = e.start?.dateTime ?? null;
  const d = e.start?.date ?? null;
  if (dt) return new Date(dt);
  if (d) return new Date(`${d}T00:00:00`);
  return null;
}

export function parseEventEnd(e: GoogleCalendarEvent): Date | null {
  const dt = e.end?.dateTime ?? null;
  const d = e.end?.date ?? null;
  if (dt) return new Date(dt);
  if (d) return new Date(`${d}T00:00:00`);
  return null;
}


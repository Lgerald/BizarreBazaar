export type GoogleCalendarEvent = {
  id?: string | null;
  htmlLink?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | null;
};


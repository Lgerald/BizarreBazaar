/** Optional GCAL_SETUP_KEY gate for OAuth bootstrap helpers. */
export function allowCalendarSetup(
  request: globalThis.Request,
  body: Record<string, unknown> | null
): boolean {
  const setupKey = process.env.GCAL_SETUP_KEY;
  if (!setupKey) return true;

  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("setupKey") ?? undefined;
  const fromBody =
    body && typeof body.setupKey === "string" ? (body.setupKey as string) : undefined;
  const provided = fromQuery ?? fromBody;

  return Boolean(provided) && provided === setupKey;
}

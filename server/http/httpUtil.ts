export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function isIsoDateTimeString(v: unknown): v is string {
  return typeof v === "string" && Number.isFinite(Date.parse(v));
}

export async function readJson(
  request: globalThis.Request
): Promise<Record<string, unknown> | null> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

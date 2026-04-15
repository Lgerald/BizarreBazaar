import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";

type ActionData = { ok: true } | { ok: false; error: string } | null;

export function CreateEventForm({
  unauthorized,
  error: externalError,
  onSuccess,
}: {
  unauthorized: boolean;
  error?: string | null;
  onSuccess?: () => void;
}) {
  const fetcher = useFetcher<ActionData>();
  const formRef = useRef<HTMLFormElement | null>(null);

  const error =
    (fetcher.data && "ok" in fetcher.data && fetcher.data.ok === false
      ? fetcher.data.error
      : null) ?? externalError ?? null;

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data) return;
    if (!("ok" in fetcher.data) || fetcher.data.ok !== true) return;
    formRef.current?.reset();
    onSuccess?.();
  }, [fetcher.state, fetcher.data, onSuccess]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>Create event</div>

      {error ? <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div> : null}

      <fetcher.Form ref={formRef} method="post" style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Title</span>
          <input
            name="summary"
            required
            placeholder="e.g. Vendor call"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Start</span>
            <input
              name="startAt"
              type="datetime-local"
              required
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>End</span>
            <input
              name="endAt"
              type="datetime-local"
              required
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Location (optional)</span>
          <input
            name="location"
            placeholder="e.g. Discord"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Description (optional)</span>
          <textarea
            name="description"
            rows={3}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "10px 12px",
              resize: "vertical",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={unauthorized}
          style={{
            justifySelf: "start",
            borderRadius: 12,
            border: "1px solid #111827",
            background: unauthorized ? "#9ca3af" : "#111827",
            color: "white",
            padding: "10px 12px",
            fontWeight: 700,
            cursor: unauthorized ? "not-allowed" : "pointer",
          }}
        >
          {fetcher.state === "submitting" ? "Creating…" : "Create event"}
        </button>
      </fetcher.Form>
    </div>
  );
}


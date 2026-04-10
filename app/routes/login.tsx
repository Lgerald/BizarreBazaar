import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuthClient } from "~/lib/firebase.client";
import { Welcome } from "~/welcome/welcome";

type MeResponse =
  | { ok: true; user: { uid: string; email?: string; name?: string; picture?: string } }
  | { ok: false };

export default function LoginRoute() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : ({ ok: false } as MeResponse)))
      .then((j) => setMe(j))
      .catch(() => setMe({ ok: false }));
  }, []);

  const authed = useMemo(() => Boolean(me && (me as any).ok), [me]);

  async function loginWithGoogle() {
    setError(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuthClient();
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Failed to create session");

      navigate("/");
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setError(null);
    setBusy(true);
    try {
      await fetch("/api/session/logout", { method: "POST" });
      setMe({ ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Welcome>
      <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Login</h1>

        {authed && me && (me as any).user ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              Signed in as{" "}
              <strong>{(me as any).user.email ?? (me as any).user.uid}</strong>
            </div>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              style={{
                justifySelf: "start",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "white",
                padding: "10px 12px",
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Sign out
            </button>
            <Link to="/">Back home</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={busy}
              style={{
                justifySelf: "start",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "#111827",
                color: "white",
                padding: "10px 12px",
                fontWeight: 800,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Continue with Google
            </button>
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              This will create an HttpOnly session cookie on the server.
            </div>
          </div>
        )}

        {error ? (
          <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div>
        ) : null}
      </div>
    </Welcome>
  );
}


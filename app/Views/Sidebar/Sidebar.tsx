import { NavLink } from "react-router";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { getFirebaseAuthClient } from "~/lib/firebase.client";

type SidebarItem = {
  label: string;
  to: string;
  children?: SidebarItem[];
};

const navItems: SidebarItem[] = [
  { label: "Users", to: "/users" },
  { label: "Calendar", to: "/calendar" },
  {
    label: "Books",
    to: "/books",
    children: [{ label: "Mall", to: "/mall" }],
  },
];

type MeResponse =
  | {
      ok: true;
      firebaseUser: { uid: string; email?: string; name?: string };
      appUser:
        | { id: string; firstName: string; lastName: string; email: string }
        | null;
    }
  | { ok: false };

export function Sidebar({
  compact,
  onNavigate,
  onRequestClose,
}: {
  compact?: boolean;
  onNavigate?: () => void;
  onRequestClose?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);

  async function refreshMe() {
    try {
      const r = await fetch("/api/me");
      const j = (r.ok ? await r.json() : ({ ok: false } as MeResponse)) as MeResponse;
      setMe(j);
    } catch {
      setMe({ ok: false });
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  // Prefill signup fields once we know they're authed-but-not-provisioned.
  useEffect(() => {
    if (!me?.ok) return;
    if (me.appUser) return;
    const fullName = (me.firebaseUser.name ?? "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const first = parts[0] ?? "";
    const last = parts.slice(1).join(" ");
    setSignupFirstName((v) => (v ? v : first));
    setSignupLastName((v) => (v ? v : last));
  }, [me]);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/session/logout", { method: "POST" });
      await refreshMe();
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function loginWithGoogle() {
    setLoginError(null);
    setSignupError(null);
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

      await refreshMe();
      // Sign-in succeeded; close the modal. If signup is needed, the menu will
      // offer a "Complete sign up" action.
      setLoginOpen(false);
      setMenuOpen(false);
    } catch (e: any) {
      setLoginError(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function signup() {
    setSignupError(null);
    setBusy(true);
    try {
      if (!me?.ok) throw new Error("Not signed in");
      const email = me.firebaseUser.email;
      if (!email) throw new Error("Missing email from Google account");

      const firstName = signupFirstName.trim();
      const lastName = signupLastName.trim();
      if (!firstName || !lastName) {
        throw new Error("First name and last name are required");
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      if (!res.ok) throw new Error("Failed to create account");

      await refreshMe();
      setLoginOpen(false);
      setMenuOpen(false);
    } catch (e: any) {
      setSignupError(e?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      style={{
        borderRight: "1px solid #e5e7eb",
        padding: compact ? 10 : 12,
        display: "grid",
        gap: 12,
        alignContent: "start",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 800 }}>BizarreBazaar</div>
          {me?.ok && me.appUser ? (
            <div style={{ fontSize: 13, color: "#4b5563", fontWeight: 600 }}>
              Hi {me.appUser.firstName} {me.appUser.lastName}
            </div>
          ) : null}
        </div>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          {onRequestClose ? (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => {
                setMenuOpen(false);
                onRequestClose();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                marginRight: 8,
              }}
            >
              ✕
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Open menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "white",
              cursor: "pointer",
            }}
          >
            ⋮
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label="Sidebar menu"
              style={{
                position: "absolute",
                top: 40,
                right: 0,
                minWidth: 160,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "white",
                padding: 6,
                boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                display: "grid",
                gap: 4,
              }}
            >
              {me?.ok ? null : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLoginError(null);
                    setLoginOpen(true);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111827",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Login
                </button>
              )}

              {me?.ok && !me.appUser ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSignupError(null);
                    setLoginError(null);
                    setLoginOpen(true);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#111827",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Complete sign up
                </button>
              ) : null}

              {me?.ok ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  disabled={busy}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    cursor: busy ? "not-allowed" : "pointer",
                    color: "#111827",
                    fontWeight: 600,
                  }}
                >
                  Sign out
                </button>
              ) : null}

              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLScbckTFS6-PaFa0UgbtEBc4PjjWR8YVt37b2za3UbR8GnFgMQ/viewform?usp=publish-editor"
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "#111827",
                  background: "transparent",
                  border: "1px solid transparent",
                  fontWeight: 600,
                }}
              >
                Feedback
              </a>

              <button
                type="button"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <nav aria-label="Primary navigation" style={{ display: "grid", gap: 8 }}>
        {navItems.map((item) => (
          <div key={item.to} style={{ display: "grid", gap: 6 }}>
            <NavLink
              to={item.to}
              end
              onClick={() => {
                setMenuOpen(false);
                onNavigate?.();
              }}
              style={({ isActive }) => ({
                padding: "10px 12px",
                borderRadius: 12,
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                background: isActive ? "#111827" : "white",
                color: isActive ? "white" : "#111827",
                fontWeight: 600,
              })}
            >
              {item.label}
            </NavLink>

            {item.children?.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.();
                    }}
                    style={({ isActive }) => ({
                      padding: "10px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      border: "1px solid #e5e7eb",
                      background: isActive ? "#111827" : "white",
                      color: isActive ? "white" : "#111827",
                      fontWeight: 600,
                    })}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      {loginOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Login"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLoginOpen(false);
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
              width: "min(520px, 100%)",
              borderRadius: 16,
              background: "white",
              border: "1px solid #e5e7eb",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {me?.ok && !me.appUser ? "Finish sign up" : "Sign in"}
              </div>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                style={{
                  marginLeft: "auto",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                }}
                aria-label="Close login modal"
              >
                ✕
              </button>
            </div>

            {me?.ok && !me.appUser ? (
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    Email (from Google)
                  </span>
                  <input
                    value={me.firebaseUser.email ?? ""}
                    readOnly
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#f9fafb",
                    }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>First name</span>
                    <input
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Last name</span>
                    <input
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={signup}
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
                  Create account
                </button>

                {signupError ? (
                  <div style={{ color: "#b91c1c", fontWeight: 600 }}>
                    {signupError}
                  </div>
                ) : null}
              </div>
            ) : (
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
            )}

            {loginError ? (
              <div style={{ color: "#b91c1c", fontWeight: 600 }}>
                {loginError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}


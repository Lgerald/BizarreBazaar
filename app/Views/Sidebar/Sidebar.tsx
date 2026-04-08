import { NavLink } from "react-router";
import { useState } from "react";

type SidebarItem = {
  label: string;
  to: string;
};

const navItems: SidebarItem[] = [
  { label: "Users", to: "/users" },
  { label: "Books", to: "/books" },
];

export function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside
      style={{
        width: 240,
        borderRight: "1px solid #e5e7eb",
        padding: 12,
        display: "grid",
        gap: 12,
        alignContent: "start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>BizarreBazaar</div>
        <div style={{ marginLeft: "auto", position: "relative" }}>
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
              }}
            >
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
          <NavLink
            key={item.to}
            to={item.to}
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
        ))}
      </nav>
    </aside>
  );
}


import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { Sidebar } from "~/Views/Sidebar/Sidebar";

export function Welcome({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Close the drawer on navigation (mobile).
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <main className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setSidebarOpen(true)}
            className="h-10 w-10 grid place-items-center rounded-xl border border-gray-200 bg-white"
          >
            ☰
          </button>
          <div className="font-extrabold">BizarreBazaar</div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={[
          "md:hidden fixed inset-0 z-40",
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={[
            "absolute inset-0 bg-black/40 transition-opacity",
            sidebarOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
          onMouseDown={() => setSidebarOpen(false)}
        />
        <div
          className={[
            "absolute inset-y-0 left-0 w-[min(320px,85vw)] bg-white shadow-2xl transition-transform",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {sidebarOpen ? (
            <Sidebar
              compact
              onNavigate={() => setSidebarOpen(false)}
              onRequestClose={() => setSidebarOpen(false)}
            />
          ) : null}
        </div>
      </div>

      <section className="p-3 md:p-4 grid gap-4">
        {children}
      </section>
    </main>
  );
}


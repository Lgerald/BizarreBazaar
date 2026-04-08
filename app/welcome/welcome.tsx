import { Sidebar } from "~/Views/Sidebar/Sidebar";

export function Welcome({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        minHeight: "100vh",
      }}
    >
      <Sidebar />
      <section style={{ padding: 16, display: "grid", gap: 16 }}>
        {children}
      </section>
    </main>
  );
}


import type { Route } from "./+types/_index";
import { Link } from "react-router";
import { Welcome } from "~/welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BizarreBazaar" },
    { name: "description", content: "BizarreBazaar" },
  ];
}

export default function Index() {
  return (
    <Welcome>
      <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
          Welcome to BizarreBazaar
        </h1>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Choose a section in the sidebar, or jump in here.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/books">Browse books</Link>
          <Link to="/users">Browse users</Link>
        </div>
      </div>
    </Welcome>
  );
}


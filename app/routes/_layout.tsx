import { Outlet } from "react-router";

import { Welcome } from "~/welcome/welcome";

export default function AppLayoutRoute() {
  return (
    <Welcome>
      <Outlet />
    </Welcome>
  );
}


import type { Route } from "./+types/users";
import { useLoaderData } from "react-router";

import { UsersGrid } from "~/Views/Users/UsersGrid";
import type { UserViewModel } from "~/Views/Users/UserCard";

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/users`);
  if (!res.ok) throw new Response("Failed to load users", { status: 500 });
  const json = await res.json();
  return { users: json.users as UserViewModel[] };
}

export default function UsersRoute() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Users</h1>
      <UsersGrid users={users} />
    </>
  );
}


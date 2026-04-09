import { UserCard, type UserViewModel } from "./UserCard";
import { Link } from "react-router";

export function UsersGrid({ users }: { users: UserViewModel[] }) {
  if (users.length === 0) {
    return <div style={{ color: "#6b7280" }}>No users yet.</div>;
  }

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 12,
      }}
    >
      {users.map((user) => (
        <Link
          key={user.id}
          to={`/users/${user.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <UserCard user={user} />
        </Link>
      ))}
    </section>
  );
}


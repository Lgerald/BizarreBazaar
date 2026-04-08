export type UserViewModel = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export function UserCard({ user }: { user: UserViewModel }) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16 }}>
        {user.firstName} {user.lastName}
      </div>
      <div style={{ color: "#4b5563" }}>{user.email}</div>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>id: {user.id}</div>
    </section>
  );
}


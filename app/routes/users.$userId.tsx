import type { Route } from "./+types/users.$userId";
import { Form, useLoaderData } from "react-router";

import { BooksGrid } from "~/Views/Books/BooksGrid";
import type { BookViewModel } from "~/Views/Books/BookCard";
import { UserCard, type UserViewModel } from "~/Views/Users/UserCard";
import { Welcome } from "~/welcome/welcome";

export async function action({ params, request }: Route.ActionArgs) {
  const userId = params.userId;
  if (!userId) throw new Response("Missing userId", { status: 400 });

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !url) {
    return new Response("title and url are required", { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerId: userId,
      title,
      url,
      ...(author ? { author } : {}),
      ...(description ? { description } : {}),
    }),
  });

  if (!res.ok) throw new Response("Failed to create book", { status: 500 });
  return null;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const userId = params.userId;
  if (!userId) throw new Response("Missing userId", { status: 400 });

  const origin = new URL(request.url).origin;
  const [userRes, booksRes] = await Promise.all([
    fetch(`${origin}/api/users/${userId}`),
    fetch(`${origin}/api/users/${userId}/books`),
  ]);

  if (userRes.status === 404) throw new Response("User not found", { status: 404 });
  if (!userRes.ok) throw new Response("Failed to load user", { status: 500 });
  if (!booksRes.ok) throw new Response("Failed to load books", { status: 500 });

  const userJson = await userRes.json();
  const booksJson = await booksRes.json();

  return {
    user: userJson.user as UserViewModel,
    books: booksJson.books as BookViewModel[],
  };
}

export default function UserDetailRoute() {
  const { user, books } = useLoaderData<typeof loader>();

  return (
    <Welcome>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>User</h1>
      <UserCard user={user} />

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          Add a new book
        </h2>

        <Form method="post" style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Title</span>
            <input
              name="title"
              required
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>URL</span>
            <input
              name="url"
              type="url"
              required
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Author (optional)</span>
            <input
              name="author"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Description (optional)</span>
            <textarea
              name="description"
              rows={3}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
                resize: "vertical",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              justifySelf: "start",
              borderRadius: 12,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              padding: "10px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Create book
          </button>
        </Form>
      </section>

      <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 800 }}>
        Books
      </h2>
      <BooksGrid books={books} />
    </Welcome>
  );
}


import type { Route } from "./+types/books";
import { useLoaderData } from "react-router";

import { BooksGrid } from "~/Views/Books/BooksGrid";
import type { BookViewModel } from "~/Views/Books/BookCard";
import { Welcome } from "~/welcome/welcome";

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/books?page=1&limit=50`);
  if (!res.ok) throw new Response("Failed to load books", { status: 500 });
  const json = await res.json();
  return { books: json.books as BookViewModel[] };
}

export default function BooksRoute() {
  const { books } = useLoaderData<typeof loader>();

  return (
    <Welcome>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Books</h1>
      <BooksGrid books={books} />
    </Welcome>
  );
}


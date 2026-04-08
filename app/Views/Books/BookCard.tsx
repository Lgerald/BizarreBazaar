export type BookViewModel = {
  id: string;
  title: string;
  url: string;
  author?: string | null;
  description?: string | null;
  ownerId?: string;
};

export function BookCard({ book }: { book: BookViewModel }) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16 }}>{book.title}</div>

      {book.author ? (
        <div style={{ color: "#4b5563" }}>by {book.author}</div>
      ) : null}

      {book.description ? (
        <div style={{ color: "#6b7280" }}>{book.description}</div>
      ) : null}

      <a href={book.url} target="_blank" rel="noreferrer">
        {book.url}
      </a>

      <div style={{ color: "#9ca3af", fontSize: 12 }}>id: {book.id}</div>
    </section>
  );
}


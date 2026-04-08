import { BookCard, type BookViewModel } from "./BookCard";

export function BooksGrid({ books }: { books: BookViewModel[] }) {
  if (books.length === 0) {
    return <div style={{ color: "#6b7280" }}>No books yet.</div>;
  }

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 12,
      }}
    >
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </section>
  );
}


import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookCard } from "~/Views/Books/BookCard";

describe("BookCard", () => {
  it("renders title and link", () => {
    render(
      <BookCard
        book={{
          id: "b1",
          title: "My Book",
          url: "https://example.com/book",
          author: "Someone",
          description: "A description",
        }}
      />
    );

    expect(screen.getByText("My Book")).toBeInTheDocument();
    expect(screen.getByText(/by\s+someone/i)).toBeInTheDocument();
    expect(screen.getByText("A description")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "https://example.com/book" });
    expect(link).toHaveAttribute("href", "https://example.com/book");
  });
});


import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { BookCard } from "~/Views/Books/BookCard";

describe("BookCard", () => {
  it("renders title and link", () => {
    render(
      <MemoryRouter>
        <BookCard
          book={{
            id: "b1",
            title: "My Book",
            url: "https://example.com/book",
            author: "Someone",
            ownerId: "u1",
            ownerName: "Leah Gerald",
            description: "A description",
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("My Book")).toBeInTheDocument();
    expect(screen.getByText(/by\s+someone/i)).toBeInTheDocument();
    const ownerLink = screen.getByRole("link", { name: /leah gerald/i });
    expect(ownerLink).toHaveAttribute("href", "/users/u1");
    expect(screen.getByText("A description")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /deets/i });
    expect(link).toHaveAttribute("href", "https://example.com/book");
  });
});


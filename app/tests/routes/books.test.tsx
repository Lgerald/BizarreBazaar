import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BooksRoute, { loader as booksLoader } from "~/routes/books";

function mockFetchForBooks() {
  global.fetch = vi.fn(async (input: any) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return { ok: false, status: 401, json: async () => ({ ok: false }) } as any;
    }
    if (url.includes("/api/books?page=1&limit=50")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          books: [
            {
              id: "b1",
              title: "T1",
              url: "https://example.com",
              ownerId: "u1",
              ownerName: "A One",
            },
          ],
        }),
      } as any;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as any;
}

describe("books route", () => {
  it("loads books and renders grid", async () => {
    mockFetchForBooks();

    const router = createMemoryRouter(
      [
        {
          path: "/books",
          Component: BooksRoute,
          loader: booksLoader as any,
        },
      ],
      { initialEntries: ["/books"] }
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Books" })).toBeInTheDocument();
    expect(screen.getByText("T1")).toBeInTheDocument();
  });
});

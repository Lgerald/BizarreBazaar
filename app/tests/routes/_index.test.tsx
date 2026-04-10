import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import IndexRoute from "~/routes/_index";

function mockFetchDefault() {
  global.fetch = vi.fn(async (input: any) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return { ok: false, status: 401, json: async () => ({ ok: false }) } as any;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as any;
}

describe("_index route", () => {
  it("renders welcome heading and browse links", async () => {
    mockFetchDefault();

    const router = createMemoryRouter(
      [{ path: "/", Component: IndexRoute }],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: /welcome to bizarrebazaar/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse books/i })).toHaveAttribute(
      "href",
      "/books"
    );
    expect(screen.getByRole("link", { name: /browse users/i })).toHaveAttribute(
      "href",
      "/users"
    );
  });
});

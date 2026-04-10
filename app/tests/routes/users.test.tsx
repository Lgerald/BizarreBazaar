import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import UsersRoute, { loader as usersLoader } from "~/routes/users";

function mockFetchForUsers() {
  global.fetch = vi.fn(async (input: any) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return { ok: false, status: 401, json: async () => ({ ok: false }) } as any;
    }
    if (url.endsWith("/api/users")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          users: [
            {
              id: "u1",
              firstName: "Leah",
              lastName: "Gerald",
              email: "leah@example.com",
            },
          ],
        }),
      } as any;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as any;
}

describe("users route", () => {
  it("loads users and renders grid", async () => {
    mockFetchForUsers();

    const router = createMemoryRouter(
      [
        {
          path: "/users",
          Component: UsersRoute,
          loader: usersLoader as any,
        },
      ],
      { initialEntries: ["/users"] }
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Leah Gerald")).toBeInTheDocument();
  });
});

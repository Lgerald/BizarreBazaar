import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppLayoutRoute from "~/routes/_layout";

function mockFetchMeOnceSignedIn() {
  global.fetch = vi.fn(async (input: any) => {
    const url = String(input);
    if (url.endsWith("/api/me")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          firebaseUser: { uid: "fb1", email: "x@x.com" },
          appUser: { id: "u1", firstName: "Leah", lastName: "Gerald", email: "x@x.com" },
        }),
      } as any;
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as any;
}

describe("app layout persistence", () => {
  it("does not re-fetch /api/me when navigating between child routes", async () => {
    const user = userEvent.setup();
    mockFetchMeOnceSignedIn();

    const Home = () => <h1>Home</h1>;
    const Users = () => <h1>Users Screen</h1>;

    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: AppLayoutRoute,
          children: [
            { index: true, Component: Home },
            { path: "users", Component: Users },
          ],
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    // Sidebar mounts once and loads /api/me once.
    expect(await screen.findByText(/hi leah gerald/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Navigate via the Sidebar NavLink.
    await user.click(screen.getByRole("link", { name: "Users" }));
    expect(await screen.findByRole("heading", { name: "Users Screen" })).toBeInTheDocument();

    // Sidebar should still be mounted; no additional /api/me fetch.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});


import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import UserRoute, { action as userAction, loader as userLoader } from "~/routes/users.$userId";

function mockFetch(respond: (url: string, init?: RequestInit) => any) {
  global.fetch = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    const out = respond(url, init);
    const status = out.status ?? 200;
    const body = out.body ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as any;
  }) as any;
}

describe("users.$userId route", () => {
  it("shows create-book form only when viewer is that user", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/me")) {
        return {
          status: 200,
          body: {
            ok: true,
            firebaseUser: { uid: "fb1", email: "x@x.com" },
            appUser: { id: "u1", firstName: "A", lastName: "One", email: "x@x.com" },
          },
        };
      }
      if (url.endsWith("/api/users/u1")) {
        return {
          status: 200,
          body: { ok: true, user: { id: "u1", firstName: "A", lastName: "One", email: "x@x.com" } },
        };
      }
      if (url.endsWith("/api/users/u1/books")) {
        return { status: 200, body: { ok: true, books: [] } };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const router = createMemoryRouter(
      [
        {
          path: "/users/:userId",
          Component: UserRoute,
          loader: userLoader as any,
        },
      ],
      { initialEntries: ["/users/u1"] }
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText(/add a new book/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create book/i })).toBeInTheDocument();
  });

  it("hides create-book form when viewer is a different user (or signed out)", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/me")) {
        return {
          status: 200,
          body: {
            ok: true,
            firebaseUser: { uid: "fb2", email: "y@y.com" },
            appUser: { id: "u2", firstName: "B", lastName: "Two", email: "y@y.com" },
          },
        };
      }
      if (url.endsWith("/api/users/u1")) {
        return {
          status: 200,
          body: { ok: true, user: { id: "u1", firstName: "A", lastName: "One", email: "x@x.com" } },
        };
      }
      if (url.endsWith("/api/users/u1/books")) {
        return { status: 200, body: { ok: true, books: [] } };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const router = createMemoryRouter(
      [
        {
          path: "/users/:userId",
          Component: UserRoute,
          loader: userLoader as any,
        },
      ],
      { initialEntries: ["/users/u1"] }
    );

    render(<RouterProvider router={router} />);

    // page loads
    expect(await screen.findByRole("heading", { name: "User" })).toBeInTheDocument();
    // form should be absent
    expect(screen.queryByText(/add a new book/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /create book/i })).toBeNull();
  });

  it("action redirects back to user page (clears form)", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("/api/books")) {
        expect(init?.method).toBe("POST");
        return { status: 201, body: { ok: true } };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const fd = new FormData();
    fd.set("title", "T");
    fd.set("url", "https://example.com");
    fd.set("author", "");
    fd.set("description", "");

    const req = new Request("http://localhost:3001/users/u1", {
      method: "POST",
      body: fd,
    });

    const res = await userAction({ params: { userId: "u1" }, request: req } as any);
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(302);
    expect((res as Response).headers.get("Location")).toBe("/users/u1");
  });
});


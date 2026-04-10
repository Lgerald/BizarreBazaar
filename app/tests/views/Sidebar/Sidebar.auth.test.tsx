import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { Sidebar } from "~/Views/Sidebar/Sidebar";

vi.mock("~/lib/firebase.client", () => {
  return {
    getFirebaseAuthClient: () => ({}),
  };
});

vi.mock("firebase/auth", async () => {
  return {
    GoogleAuthProvider: class {},
    signInWithPopup: vi.fn(async () => {
      return {
        user: {
          getIdToken: async () => "fake-id-token",
        },
      };
    }),
  };
});

function mockFetchSequence(responders: Array<(input: RequestInfo, init?: RequestInit) => any>) {
  let i = 0;
  global.fetch = vi.fn(async (input: any, init?: any) => {
    const fn = responders[i] ?? responders[responders.length - 1];
    i += 1;
    const out = fn(input, init);
    const status = out.status ?? 200;
    const body = out.body ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as any;
  }) as any;
}

describe("Sidebar auth modal", () => {
  it("shows signup form after Google login when appUser is missing, then creates user", async () => {
    const user = userEvent.setup();

    mockFetchSequence([
      // initial refreshMe (signed out)
      () => ({ status: 401, body: { ok: false } }),
      // POST /api/session/login
      (_url, init) => {
        expect(String(_url)).toBe("/api/session/login");
        expect(init?.method).toBe("POST");
        return { status: 201, body: { ok: true } };
      },
      // refreshMe after session set: firebase ok but app user missing
      () => ({
        status: 200,
        body: {
          ok: true,
          firebaseUser: { uid: "fb1", email: "new@ex.com", name: "New User" },
          appUser: null,
        },
      }),
      // POST /api/users (signup)
      (_url, init) => {
        expect(String(_url)).toBe("/api/users");
        expect(init?.method).toBe("POST");
        return { status: 201, body: { ok: true, user: { id: "u1" } } };
      },
      // refreshMe after signup: app user exists
      () => ({
        status: 200,
        body: {
          ok: true,
          firebaseUser: { uid: "fb1", email: "new@ex.com", name: "New User" },
          appUser: {
            id: "u1",
            firstName: "New",
            lastName: "User",
            email: "new@ex.com",
          },
        },
      }),
    ]);

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    // open kebab menu
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(screen.getByRole("menuitem", { name: /login/i }));

    // modal appears
    const dialog = await screen.findByRole("dialog", { name: /login/i });
    await user.click(within(dialog).getByRole("button", { name: /continue with google/i }));

    // sign-in succeeded; modal should close
    expect(screen.queryByRole("dialog", { name: /login/i })).toBeNull();

    // reopen menu and complete sign up
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    await user.click(screen.getByRole("menuitem", { name: /complete sign up/i }));

    const dialog2 = await screen.findByRole("dialog", { name: /login/i });

    // should show signup UI (email + names)
    expect(await within(dialog2).findByText(/finish sign up/i)).toBeInTheDocument();
    expect(within(dialog2).getByDisplayValue("new@ex.com")).toBeInTheDocument();

    // names are prefilled from "New User"
    expect(within(dialog2).getByDisplayValue("New")).toBeInTheDocument();
    expect(within(dialog2).getByDisplayValue("User")).toBeInTheDocument();

    await user.click(within(dialog2).getByRole("button", { name: /create account/i }));

    // modal should close after signup
    expect(screen.queryByRole("dialog", { name: /login/i })).toBeNull();
  });
});


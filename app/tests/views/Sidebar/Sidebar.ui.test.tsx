import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { Sidebar } from "~/Views/Sidebar/Sidebar";

function mockFetchMe(body: any, status = 200) {
  global.fetch = vi.fn(async () => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as any;
  }) as any;
}

describe("Sidebar", () => {
  it('shows greeting under "BizarreBazaar" when appUser exists', async () => {
    mockFetchMe({
      ok: true,
      firebaseUser: { uid: "fb1", email: "x@x.com" },
      appUser: { id: "u1", firstName: "Leah", lastName: "Gerald", email: "x@x.com" },
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(await screen.findByText(/hi leah gerald/i)).toBeInTheDocument();
  });

  it("places Feedback immediately above Close in the menu", async () => {
    const user = userEvent.setup();
    mockFetchMe({ ok: false }, 401);

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    await user.click(screen.getAllByRole("button", { name: /open menu/i })[0]!);
    const menu = screen.getByRole("menu", { name: /sidebar menu/i });
    const items = within(menu).getAllByRole("menuitem");

    const labels = items.map((el) => (el as HTMLElement).textContent?.trim());
    const closeIndex = labels.findIndex((t) => t?.toLowerCase() === "close");
    const feedbackIndex = labels.findIndex((t) => t?.toLowerCase() === "feedback");

    expect(closeIndex).toBeGreaterThan(-1);
    expect(feedbackIndex).toBeGreaterThan(-1);
    expect(feedbackIndex).toBe(closeIndex - 1);
  });
});


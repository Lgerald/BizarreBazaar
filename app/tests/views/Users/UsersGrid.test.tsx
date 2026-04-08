import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UsersGrid } from "~/Views/Users/UsersGrid";

describe("UsersGrid", () => {
  it("renders empty state", () => {
    render(<UsersGrid users={[]} />);
    expect(screen.getByText(/no users yet/i)).toBeInTheDocument();
  });

  it("renders a card per user", () => {
    render(
      <UsersGrid
        users={[
          { id: "u1", firstName: "A", lastName: "One", email: "a@x.com" },
          { id: "u2", firstName: "B", lastName: "Two", email: "b@x.com" },
        ]}
      />
    );

    expect(screen.getByText("A One")).toBeInTheDocument();
    expect(screen.getByText("B Two")).toBeInTheDocument();
  });
});


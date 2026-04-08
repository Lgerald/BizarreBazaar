import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserCard } from "~/Views/Users/UserCard";

describe("UserCard", () => {
  it("renders name, email, and id", () => {
    render(
      <UserCard
        user={{
          id: "u1",
          firstName: "Leah",
          lastName: "Gerald",
          email: "leah@example.com",
        }}
      />
    );

    expect(screen.getByText("Leah Gerald")).toBeInTheDocument();
    expect(screen.getByText("leah@example.com")).toBeInTheDocument();
    expect(screen.getByText(/id:\s*u1/i)).toBeInTheDocument();
  });
});


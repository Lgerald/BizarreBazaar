import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: [
      "app/tests/**/*.test.{ts,tsx}",
      "server/tests/**/*.test.{ts,tsx}",
    ],
    environment: "jsdom",
    setupFiles: ["./app/tests/setup.ts"],
  },
});


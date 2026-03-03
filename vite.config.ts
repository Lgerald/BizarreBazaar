import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // For GitHub Pages project sites: https://<user>.github.io/<repo>/
  // The workflow sets VITE_BASE to "/<repo>/".
  base: process.env.VITE_BASE ?? "/",
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});

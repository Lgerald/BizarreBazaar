import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  // GitHub Pages is static hosting, so we build as an SPA for now.
  ssr: false,
} satisfies Config;

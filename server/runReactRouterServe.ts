import { spawn } from "node:child_process";
import { resolveServerBuildEntry } from "./resolveServerBuild";

const entry = resolveServerBuildEntry();
const child = spawn("npx", ["react-router-serve", entry], {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));

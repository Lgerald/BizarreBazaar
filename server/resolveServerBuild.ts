import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** React Router + Vercel preset may emit a nested nodejs bundle dir under build/server instead of build/server/index.js. */
export function resolveServerBuildEntry(): string {
  const base = join(process.cwd(), "build/server");
  const direct = join(base, "index.js");
  if (existsSync(direct)) return direct;

  const sub = readdirSync(base, { withFileTypes: true }).find(
    (e) => e.isDirectory() && e.name.startsWith("nodejs_")
  );
  if (!sub) {
    throw new Error(`No React Router server build found under ${base}`);
  }
  return join(base, sub.name, "index.js");
}

export async function importServerBuild(): Promise<any> {
  return import(pathToFileURL(resolveServerBuildEntry()).href);
}

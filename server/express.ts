import { createRequestHandler } from "@react-router/express";
import cookieParser from "cookie-parser";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client/client";
import {
  handleSessionLogin,
  handleSessionLogout,
} from "./auth/session";
import { createAuthRouter } from "./api/auth";

const port = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

async function start() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const app = express();

  app.disable("x-powered-by");
  app.use(compression());
  app.use(morgan("tiny"));
  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/api/ok", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/api/db-ok", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false });
    }
  });

  // Auth/session APIs (Firebase session cookie)
  app.post("/api/session/login", handleSessionLogin);
  app.post("/api/session/logout", handleSessionLogout);
  app.use("/api", createAuthRouter(prisma as any));

  // Mount your routers if present (keeps existing behavior if you re-add them)
  try {
    const { createUsersRouter } = await import("./api/users");
    const { createBooksRouter } = await import("./api/books");
    const { createCalendarRouter } = await import("./api/calendar");
    app.use("/api", createUsersRouter(prisma as any));
    app.use("/api", createBooksRouter(prisma as any));
    app.use("/api", createCalendarRouter(prisma as any));
  } catch {
    // ignore if routers aren't present in this branch/state
  }

  // Static assets (only meaningful in production build).
  if (isProd) {
    app.use(
      "/assets",
      express.static("build/client/assets", { immutable: true, maxAge: "1y" })
    );
    app.use(express.static("build/client", { maxAge: "1h" }));
  }

  const viteDevServer = isProd
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({ server: { middlewareMode: true } })
      );

  if (viteDevServer) {
    app.use(viteDevServer.middlewares);
  }

  const remixHandler = createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
      : (
          // @ts-expect-error Build output exists only after `react-router build`
          () => import("../build/server/index.js")
        ),
  });

  app.all("*", remixHandler);

  app.listen(port, () => {
    console.log(`Express SSR server listening at http://localhost:${port}`);
  });
}

start();


import { createRequestHandler } from "@react-router/express";
import cookieParser from "cookie-parser";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import "dotenv/config";
import { getPrisma } from "./prisma";
import { mountApiOnExpress } from "./http/expressAdapter";
import { importServerBuild } from "./resolveServerBuild";

const port = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

async function start() {
  const prisma = getPrisma();

  const app = express();

  app.disable("x-powered-by");
  app.use(compression());
  app.use(morgan("tiny"));
  app.use(express.json());
  app.use(cookieParser());

  mountApiOnExpress(app, prisma as any);

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
      : () => importServerBuild(),
  });

  app.all("*", remixHandler);

  app.listen(port, () => {
    console.log(`Express SSR server listening at http://localhost:${port}`);
  });
}

start();

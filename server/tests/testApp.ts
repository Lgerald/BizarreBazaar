import cookieParser from "cookie-parser";
import express from "express";
import { mountApiOnExpress } from "../http/expressAdapter";

export function makeTestApp(prisma: any) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  mountApiOnExpress(app, prisma);
  return app;
}

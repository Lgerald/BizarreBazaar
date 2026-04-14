import express from "express";
import cookieParser from "cookie-parser";
import { createAuthRouter } from "../api/auth";
import { createBooksRouter } from "../api/books";
import { createCalendarRouter } from "../api/calendar";
import { createUsersRouter } from "../api/users";

export function makeTestApp(prisma: any) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", createAuthRouter(prisma));
  app.use("/api", createUsersRouter(prisma));
  app.use("/api", createBooksRouter(prisma));
  app.use("/api", createCalendarRouter(prisma));
  return app;
}


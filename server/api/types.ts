import type { PrismaClient } from "../../generated/prisma/client/client";

/** Shared inputs for HTTP API handlers (Web Request / Response). */
export type ApiContext = {
  request: globalThis.Request;
  pathname: string;
  method: string;
  url: URL;
  prisma: PrismaClient;
};

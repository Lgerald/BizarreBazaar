import type { Express, Request as ExpressRequest, Response as ExpressResponse } from "express";
import type { PrismaClient } from "../../generated/prisma/client/client";
import { handleApiRequest } from "./apiDispatch";

function getRequestUrl(req: ExpressRequest): URL {
  const host = req.get("host") ?? "localhost";
  const proto = req.protocol ?? "http";
  return new URL(req.originalUrl ?? req.url, `${proto}://${host}`);
}

async function expressRequestToWeb(req: ExpressRequest): Promise<Request> {
  const url = getRequestUrl(req);
  const method = req.method.toUpperCase();

  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers: req.headers as HeadersInit });
  }

  const headers = new Headers(req.headers as HeadersInit);
  let body: BodyInit | undefined;
  if (req.body !== undefined && req.body !== null) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return new Request(url, { method, headers, body });
}

async function sendWebResponse(res: ExpressResponse, response: Response): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.append(key, value);
  });
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

export function mountApiOnExpress(app: Express, prisma: PrismaClient): void {
  app.use(async (req: ExpressRequest, res: ExpressResponse, next) => {
    const pathOnly = (req.originalUrl ?? req.url).split("?")[0] ?? "";
    if (!pathOnly.startsWith("/api")) {
      return next();
    }
    try {
      const webReq = await expressRequestToWeb(req);
      const out = await handleApiRequest(webReq, { prisma });
      await sendWebResponse(res, out);
    } catch (err) {
      next(err);
    }
  });
}

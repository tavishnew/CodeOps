import type { NextFunction, Request, Response } from "express";

/**
 * Dependency-free CORS middleware for the Vercel-split deployment, where the
 * SPA origin differs from the API origin and session cookies must flow across
 * origins with credentials.
 *
 * No-op when the allow-list is empty (single-service mode): the server then
 * sets no CORS headers at all, exactly as before.
 *
 * Matched cross-origin requests get:
 *   Access-Control-Allow-Origin: <request origin>   (echoed, never `*`)
 *   Access-Control-Allow-Credentials: true
 * plus method/header echoes for preflights. Preflight OPTIONS requests always
 * short-circuit with 204 so non-CORS clients are not blocked; the browser
 * enforces the missing allow headers for disallowed origins.
 */
export function createCorsMiddleware(allowedOrigins: string[]) {
  if (!allowedOrigins.length) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  const allow = new Set(allowedOrigins.map(origin => origin.replace(/\/+$/, "")));

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowedOrigin = origin && allow.has(origin.replace(/\/+$/, "")) ? origin : undefined;

    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
      const requestedHeaders = req.headers["access-control-request-headers"];
      if (requestedHeaders) res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}

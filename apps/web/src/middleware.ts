import { defineMiddleware } from "astro:middleware";

/**
 * Global middleware — runs once per request before any page render.
 *
 * Single responsibility: set Cache-Control: no-store on every response.
 * The whole app is auth-aware (TopNav variant + per-page gates), so the
 * browser must always re-fetch on back/forward navigation. Without this
 * header, the bfcache restores rendered pages from memory and our SSR
 * gates never fire — a user who completed signup could browser-back
 * to /signup?step=3 and see the form (refresh worked because that's a
 * fresh request).
 *
 * Setting Cache-Control: no-store disables bfcache (and any HTTP cache)
 * so every navigation hits the server.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set("Cache-Control", "no-store");
  return response;
});

/**
 * API origin for the SPA.
 *
 * - Unset / empty (default): the API lives on the same origin as the page —
 *   local dev, single-service Render, or Vercel with the vercel.json /api/*
 *   rewrite. Relative `/api/...` paths are correct.
 * - Set (VITE_API_URL, e.g. https://codeops-api.onrender.com): the client is
 *   hosted separately (Vercel) and calls the Render API directly, cross-origin
 *   with credentials. Vite bakes this in at build time, so set it in the
 *   Vercel project's build environment.
 *
 * All API fetch sites (tRPC, auth, GitHub connect) go through apiUrl() so a
 * relative-path assumption never sneaks back in.
 */
const rawBase = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export const API_BASE = rawBase.trim().replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { toNodeHandler } from "better-auth/node";
import { drizzle } from "drizzle-orm/mysql2";
import {
  betterAuthAccount,
  betterAuthSession,
  betterAuthUser,
  betterAuthVerification,
} from "../../drizzle/schema";

let authInstance: any = null;

function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Better Auth");
  return drizzle(url);
}

function isApprovedPreviewOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^3000-[a-z0-9-]+\.us\d+\.manus\.computer$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function resolveTrustedOrigins(request?: Request, baseURL?: string) {
  const configured = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
  const origins = new Set<string>(configured);
  if (baseURL) origins.add(new URL(baseURL).origin);
  const requestOrigin = request?.headers.get("origin");
  if (requestOrigin && isApprovedPreviewOrigin(requestOrigin)) origins.add(requestOrigin);
  return Array.from(origins);
}

export function getBetterAuth() {
  if (!authInstance) {
    const baseURL = process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || "3000"}`;
    const secret = process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("BETTER_AUTH_SECRET is required for Better Auth");

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    authInstance = betterAuth({
      database: drizzleAdapter(getDatabase(), {
        provider: "mysql",
        schema: {
          user: betterAuthUser,
          session: betterAuthSession,
          account: betterAuthAccount,
          verification: betterAuthVerification,
        },
      }),
      secret,
      baseURL,
      trustedOrigins: async (request?: Request) => resolveTrustedOrigins(request, baseURL),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
      },
      socialProviders: {
        ...(githubClientId && githubClientSecret
          ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
          : {}),
        ...(googleClientId && googleClientSecret
          ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
          : {}),
      },
    });
  }
  return authInstance;
}

export function getBetterAuthHandler() {
  return toNodeHandler(getBetterAuth());
}

export type BetterAuthSession = Awaited<ReturnType<ReturnType<typeof getBetterAuth>["api"]["getSession"]>>;

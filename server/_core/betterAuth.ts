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
import { ENV } from "./env";

let authInstance: any = null;

function getDatabase() {
  if (!ENV.databaseUrl) throw new Error("DATABASE_URL is required for Better Auth");
  return drizzle(ENV.databaseUrl);
}

/** Trusted origins = configured allow-list + the app's own origin. */
export function resolveTrustedOrigins(configured: string[], baseURL: string): string[] {
  const origins = new Set<string>();
  for (const entry of configured) {
    const origin = entry.trim();
    if (origin) origins.add(origin);
  }
  try {
    origins.add(new URL(baseURL).origin);
  } catch {
    // Ignore an invalid base URL; configured origins still apply.
  }
  return Array.from(origins);
}

export function getBetterAuth() {
  if (!authInstance) {
    const baseURL = ENV.auth.url;
    const secret = ENV.auth.secret;
    if (!secret) throw new Error("BETTER_AUTH_SECRET is required for Better Auth");

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
      trustedOrigins: resolveTrustedOrigins(ENV.auth.trustedOrigins, baseURL),
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
      },
      // GitHub OAuth credentials are reserved for the per-user repository
      // connect flow (server/githubService.ts). GitHub OAuth Apps accept a
      // single callback URL, so GitHub social sign-in would need its own app
      // and cannot share these credentials — it is intentionally not enabled.
      socialProviders: {
        ...(ENV.google.clientId && ENV.google.clientSecret
          ? { google: { clientId: ENV.google.clientId, clientSecret: ENV.google.clientSecret } }
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

import "dotenv/config";

function list(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Environment configuration for standalone deployments (Render, Vercel, bare Node).
 * Better Auth is the single auth system; no Manus platform variables are read anywhere.
 */
export const ENV = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  auth: {
    secret: process.env.BETTER_AUTH_SECRET ?? "",
    url: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || "3000"}`,
    trustedOrigins: list(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GITHUB_CALLBACK_URL ?? "",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  /** Optional AES key for encrypting stored tokens. Falls back to a hash of BETTER_AUTH_SECRET. */
  tokenEncryptionKey: process.env.GITHUB_TOKEN_ENCRYPTION_KEY ?? "",
  /** Optional demo account. When both are set, a clearly-labeled demo user is provisioned on boot. */
  demo: {
    email: process.env.DEMO_EMAIL ?? "",
    password: process.env.DEMO_PASSWORD ?? "",
  },
};

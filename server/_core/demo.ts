import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb, upsertUser } from "../db";
import { seedWorkspace, getOrCreateWorkspace } from "../seed";
import { ENV } from "./env";
import { getBetterAuth } from "./betterAuth";

/**
 * Provisions the single demo account when DEMO_EMAIL / DEMO_PASSWORD are set.
 *
 * The demo account is the only account that carries seeded walkthrough data
 * (Axiom, AutoQA, Notely, SignalDock + related rows). It is flagged `demo` in
 * the users table so the UI shows a DEMO badge, GitHub connect/sync actions
 * are rejected server-side, and real sign-ups stay empty until they connect
 * their own GitHub account.
 *
 * Idempotent: safe to run on every server boot. If the Better Auth user does
 * not exist yet it is created through the public server-side sign-up API; the
 * matching `users` row is then marked demo and its workspace is seeded.
 */
export async function ensureDemoAccount(): Promise<string | null> {
  const email = ENV.demo.email?.trim().toLowerCase();
  const password = ENV.demo.password;
  if (!email || !password) return null;

  const db = await getDb();
  if (!db) {
    console.warn("[demo] database unavailable — demo account not provisioned");
    return null;
  }

  const lookup = async () => (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  let account = await lookup();

  if (!account) {
    try {
      const auth = getBetterAuth();
      const result = await auth.api.signUpEmail({
        body: { email, password, name: "CodeOps Demo" },
      });
      const betterUserId = result?.user?.id;
      if (!betterUserId) {
        console.warn("[demo] Better Auth did not return a user for the demo sign-up");
        return null;
      }
      await upsertUser({
        openId: `better-auth:${betterUserId}`,
        name: "CodeOps Demo",
        email,
        loginMethod: "better-auth",
      });
      account = await lookup();
    } catch (error) {
      console.warn("[demo] demo account could not be created:", error instanceof Error ? error.message : error);
      return null;
    }
  }
  if (!account) return null;

  await db.update(users).set({ demo: 1 }).where(eq(users.id, account.id));
  const workspace = await getOrCreateWorkspace(db, account.id, "Demo");
  await seedWorkspace(db, workspace.id);
  console.log(`[demo] demo account ready (${email}) with seeded walkthrough data.`);
  return email;
}

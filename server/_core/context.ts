import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getBetterAuth } from "./betterAuth";
import { fromNodeHeaders } from "better-auth/node";
import { getUserByOpenId, upsertUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const session = await getBetterAuth().api.getSession({ headers: fromNodeHeaders(opts.req.headers) });
    if (session?.user) {
      const openId = `better-auth:${session.user.id}`;
      await upsertUser({ openId, name: session.user.name, email: session.user.email, loginMethod: "better-auth" });
      user = (await getUserByOpenId(openId)) ?? null;
    }
  } catch (error) {
    // Authentication is optional for public procedures. Legacy Manus sessions remain valid during migration.
    try { user = await sdk.authenticateRequest(opts.req); } catch { user = null; }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

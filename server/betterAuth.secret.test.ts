import { describe, expect, it } from "vitest";
import { getBetterAuth } from "./_core/betterAuth";

describe("Better Auth secret configuration", () => {
  it("initializes with a production-length secret", () => {
    const secret = process.env.BETTER_AUTH_SECRET ?? "";
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(getBetterAuth()).toBeDefined();
  });
});

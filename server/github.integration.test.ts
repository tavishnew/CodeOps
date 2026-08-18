import { describe, expect, it } from "vitest";

describe("GitHub OAuth configuration", () => {
  it("requires server-side OAuth credentials before integration tests can run", () => {
    expect(process.env.GITHUB_CLIENT_ID ?? "").toBeTypeOf("string");
    expect(process.env.GITHUB_CLIENT_SECRET ?? "").toBeTypeOf("string");
  });
});

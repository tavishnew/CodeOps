import { describe, expect, it } from "vitest";
import { resolveTrustedOrigins } from "./_core/betterAuth";

describe("Better Auth trusted origins", () => {
  it("includes the base URL origin and every configured origin", () => {
    const origins = resolveTrustedOrigins(
      ["https://app.example.com", "https://api.example.com"],
      "http://localhost:3000",
    );
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("https://app.example.com");
    expect(origins).toContain("https://api.example.com");
  });

  it("trims, drops empty entries, and deduplicates against the base origin", () => {
    const origins = resolveTrustedOrigins(
      ["", "  https://api.example.com ", "https://api.example.com"],
      "https://api.example.com",
    );
    expect(origins).toEqual(["https://api.example.com"]);
  });

  it("never trusts an origin that was not configured", () => {
    const origins = resolveTrustedOrigins([], "http://localhost:3000");
    expect(origins).toEqual(["http://localhost:3000"]);
    expect(origins).not.toContain("https://attacker.example.com");
  });
});

import { describe, expect, it } from "vitest";
import { resolveTrustedOrigins } from "./_core/betterAuth";

describe("Better Auth trusted origins", () => {
  it("accepts the current HTTPS Manus preview origin", () => {
    const request = new Request("https://codeops.example.test", {
      headers: { origin: "https://3000-idcxeimpqp98iwuy8p6q8-d5392531.us4.manus.computer" },
    });
    expect(resolveTrustedOrigins(request, "http://localhost:3000")).toContain(
      "https://3000-idcxeimpqp98iwuy8p6q8-d5392531.us4.manus.computer",
    );
  });

  it("keeps configured and base origins while rejecting arbitrary origins", () => {
    const request = new Request("https://codeops.example.test", {
      headers: { origin: "https://attacker.example.com" },
    });
    const origins = resolveTrustedOrigins(request, "http://localhost:3000");
    expect(origins).toContain("http://localhost:3000");
    expect(origins).not.toContain("https://attacker.example.com");
  });
});


describe("Better Auth preview host matching", () => {
  it("does not trust non-HTTPS or non-Manus hosts", () => {
    const httpRequest = new Request("http://codeops.example.test", {
      headers: { origin: "http://3000-idcxeimpqp98iwuy8p6q8-d5392531.us4.manus.computer" },
    });
    const wrongHostRequest = new Request("https://codeops.example.test", {
      headers: { origin: "https://3000-idcxeimpqp98iwuy8p6q8.example.com" },
    });
    expect(resolveTrustedOrigins(httpRequest)).not.toContain(
      "http://3000-idcxeimpqp98iwuy8p6q8-d5392531.us4.manus.computer",
    );
    expect(resolveTrustedOrigins(wrongHostRequest)).not.toContain(
      "https://3000-idcxeimpqp98iwuy8p6q8.example.com",
    );
  });
});


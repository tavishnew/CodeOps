import { describe, expect, it } from "vitest";

// Must be set before the encryption module (and its ENV import) is evaluated
// in this test file, so the key derivation is deterministic.
process.env.BETTER_AUTH_SECRET = "encryption-unit-test-secret";

async function loadEncryption() {
  return import("./_core/encryption");
}

describe("token encryption helper", () => {
  it("round-trips a secret and tags the payload with a version", async () => {
    const { encryptSecret, decryptSecret } = await loadEncryption();
    const secret = "gho_1234567890abcdef";
    const encrypted = encryptSecret(secret);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted.split(":")).toHaveLength(4);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("rejects tampered payloads instead of returning garbage", async () => {
    const { encryptSecret, decryptSecret } = await loadEncryption();
    const encrypted = encryptSecret("sensitive-token");
    const tampered = encrypted.slice(0, -2) + (encrypted.endsWith("AA") ? "BB" : "AA");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("encrypts the same secret to different payloads each time (random IV)", async () => {
    const { encryptSecret } = await loadEncryption();
    const first = encryptSecret("same-secret");
    const second = encryptSecret("same-secret");
    expect(first).not.toBe(second);
  });
});

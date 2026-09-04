import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./env";

function encryptionKey(): Buffer {
  const material = ENV.tokenEncryptionKey || ENV.auth.secret;
  if (!material) throw new Error("BETTER_AUTH_SECRET (or GITHUB_TOKEN_ENCRYPTION_KEY) is required to encrypt stored tokens");
  return createHash("sha256").update(material).digest();
}

/** Encrypt a secret for storage. Output format: v1:<iv base64>:<authTag base64>:<ciphertext base64> */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("Unsupported encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

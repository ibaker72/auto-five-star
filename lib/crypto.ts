import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export type EncryptedBlob = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export function encrypt(plaintext: string): EncryptedBlob {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ct.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decrypt(blob: EncryptedBlob): string {
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const ct = Buffer.from(blob.ciphertext, "base64");
  if (tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function encryptToString(plaintext: string): string {
  const { ciphertext, iv, tag } = encrypt(plaintext);
  return `${iv}:${tag}:${ciphertext}`;
}

export function decryptFromString(packed: string): string {
  const parts = packed.split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted payload");
  const [iv, tag, ciphertext] = parts as [string, string, string];
  return decrypt({ iv, tag, ciphertext });
}

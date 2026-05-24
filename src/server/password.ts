import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const scryptPrefix = "scrypt$v1";
const scryptKeyLength = 64;

function legacySha256(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function safeEqual(first: Buffer, second: Buffer) {
  return first.length === second.length && timingSafeEqual(first, second);
}

export function hashRoomPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, scryptKeyLength).toString("base64url");
  return `${scryptPrefix}$${salt}$${hash}`;
}

export function isLegacyRoomPasswordHash(passwordHash: string | undefined) {
  return Boolean(passwordHash && !passwordHash.startsWith(`${scryptPrefix}$`));
}

export function verifyRoomPassword(password: string | undefined, passwordHash: string | undefined) {
  if (!passwordHash) return true;
  if (!password) return false;

  if (!passwordHash.startsWith(`${scryptPrefix}$`)) {
    return safeEqual(Buffer.from(legacySha256(password), "hex"), Buffer.from(passwordHash, "hex"));
  }

  const [, , salt, expectedHash] = passwordHash.split("$");
  if (!salt || !expectedHash) return false;
  const actual = scryptSync(password, salt, scryptKeyLength);
  return safeEqual(actual, Buffer.from(expectedHash, "base64url"));
}

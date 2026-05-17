import { createHash } from "node:crypto";

export function hashRoomPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyRoomPassword(password: string | undefined, passwordHash: string | undefined) {
  if (!passwordHash) return true;
  if (!password) return false;
  return hashRoomPassword(password) === passwordHash;
}

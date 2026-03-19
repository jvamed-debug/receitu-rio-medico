import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const reference = Buffer.from(hash, "hex");

  if (candidate.length !== reference.length) {
    return false;
  }

  return timingSafeEqual(candidate, reference);
}

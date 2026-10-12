import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, 32);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

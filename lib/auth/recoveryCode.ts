import { randomBytes } from "crypto";

export function generateRecoveryCode(): string {
  const hex = randomBytes(10).toString("hex").toUpperCase();
  return hex.match(/.{1,4}/g)!.join("-");
}

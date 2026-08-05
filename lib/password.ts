import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { normalizePassword } from "./passwordPolicy";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

/**
 * Password storage.
 *
 * scrypt ships with Node, so there is no native dependency to build on the
 * little server this site runs on, and it is memory-hard — a stolen database is
 * not brute-forceable with a GPU rig the way an unsalted hash would be.
 *
 * Format: scrypt$N$r$p$<salt hex>$<hash hex>
 */
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(normalizePassword(password), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scrypt(
      normalizePassword(password),
      Buffer.from(saltHex, "hex"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM }
    );
    // Constant time: a timing difference would leak how much of the hash matched.
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Never store or compare a raw session token — only this digest. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_RULES,
  checkPasswordStrength,
  normalizePassword,
} from "./passwordPolicy";
export type { PasswordProblem, PasswordRule, PasswordStrength } from "./passwordPolicy";

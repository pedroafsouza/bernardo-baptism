import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

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
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, {
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
      password.normalize("NFKC"),
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

export const MIN_PASSWORD_LENGTH = 12;

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "admin", "admin123",
  "administrator", "123456", "12345678", "123456789", "1234567890", "qwerty",
  "qwerty123", "letmein", "welcome", "welcome1", "iloveyou", "monkey",
  "dragon", "football", "baseball", "sunshine", "princess", "trustno1",
  "abc123", "changeme", "secret", "master", "hello123", "pedro123",
  "bernardo", "bernardo123", "baptism", "barnedaab", "barnedåb",
]);

export type PasswordProblem =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "NO_LOWERCASE"
  | "NO_UPPERCASE"
  | "NO_DIGIT"
  | "NO_SYMBOL"
  | "COMMON"
  | "CONTAINS_USERNAME"
  | "REPEATED"
  | "SEQUENTIAL";

/**
 * Strength policy for every password an admin picks. Deliberately strict: the
 * panel can delete the whole guest list, and the only thing in front of it is
 * this password.
 */
export function checkPasswordStrength(
  password: string,
  username?: string
): { ok: boolean; problems: PasswordProblem[] } {
  const problems: PasswordProblem[] = [];
  const pw = password ?? "";
  const lower = pw.toLowerCase();

  if (pw.length < MIN_PASSWORD_LENGTH) problems.push("TOO_SHORT");
  if (pw.length > 200) problems.push("TOO_LONG");
  if (!/[a-zæøå]/.test(lower)) problems.push("NO_LOWERCASE");
  if (!/[A-ZÆØÅ]/.test(pw)) problems.push("NO_UPPERCASE");
  if (!/[0-9]/.test(pw)) problems.push("NO_DIGIT");
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push("NO_SYMBOL");
  if (COMMON_PASSWORDS.has(lower)) problems.push("COMMON");
  if (username && username.length >= 3 && lower.includes(username.toLowerCase())) {
    problems.push("CONTAINS_USERNAME");
  }
  if (/(.)\1{3,}/.test(pw)) problems.push("REPEATED");
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(pw)) {
    problems.push("SEQUENTIAL");
  }

  return { ok: problems.length === 0, problems };
}

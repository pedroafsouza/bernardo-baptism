/**
 * The password policy, kept free of any Node-only import so the browser can run
 * exactly the same rules the server enforces. When the two disagree the user
 * sees a rule light up green and the save still fail — which is precisely the
 * confusion this module exists to prevent.
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;

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

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "admin", "admin123",
  "administrator", "123456", "12345678", "123456789", "1234567890", "qwerty",
  "qwerty123", "letmein", "welcome", "welcome1", "iloveyou", "monkey",
  "dragon", "football", "baseball", "sunshine", "princess", "trustno1",
  "abc123", "changeme", "secret", "master", "hello123", "pedro123",
  "bernardo", "bernardo123", "baptism", "barnedaab", "barnedåb",
]);

/**
 * Passwords are compared, hashed and measured in the same normal form, so a
 * character typed as "å" and one typed as "a + ring above" are one password
 * everywhere instead of passing one check and failing another.
 */
export function normalizePassword(value: string): string {
  return (value ?? "").normalize("NFKC");
}

/**
 * Unicode-aware character classes. The earlier ASCII versions both over- and
 * under-counted: "å" was accepted as a symbol, and the lowercase test ran
 * against an already-lowercased copy, so it could never fail.
 */
const HAS_LOWERCASE = /\p{Ll}/u;
const HAS_UPPERCASE = /\p{Lu}/u;
const HAS_DIGIT = /\p{Nd}/u;
/** Anything that is neither a letter nor a number counts as a symbol. */
const HAS_SYMBOL = /[^\p{L}\p{N}]/u;
const FOUR_IN_A_ROW = /(.)\1{3,}/u;
const OBVIOUS_SEQUENCE =
  /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|1q2w|zxcv)/iu;

/** One requirement, in the order it is shown to the user. */
export type PasswordRule = {
  id: PasswordProblem;
  /** True when this requirement is satisfied. */
  passes: (password: string, username?: string) => boolean;
  /** Requirements that only make sense once something has been typed. */
  appliesToEmpty: boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "TOO_SHORT",
    appliesToEmpty: true,
    passes: (pw) => normalizePassword(pw).length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "TOO_LONG",
    appliesToEmpty: false,
    passes: (pw) => normalizePassword(pw).length <= MAX_PASSWORD_LENGTH,
  },
  {
    id: "NO_LOWERCASE",
    appliesToEmpty: true,
    passes: (pw) => HAS_LOWERCASE.test(normalizePassword(pw)),
  },
  {
    id: "NO_UPPERCASE",
    appliesToEmpty: true,
    passes: (pw) => HAS_UPPERCASE.test(normalizePassword(pw)),
  },
  {
    id: "NO_DIGIT",
    appliesToEmpty: true,
    passes: (pw) => HAS_DIGIT.test(normalizePassword(pw)),
  },
  {
    id: "NO_SYMBOL",
    appliesToEmpty: true,
    passes: (pw) => HAS_SYMBOL.test(normalizePassword(pw)),
  },
  {
    id: "COMMON",
    appliesToEmpty: false,
    passes: (pw) => !COMMON_PASSWORDS.has(normalizePassword(pw).toLowerCase()),
  },
  {
    id: "CONTAINS_USERNAME",
    appliesToEmpty: false,
    passes: (pw, username) => {
      const name = (username ?? "").trim().toLowerCase();
      if (name.length < 3) return true;
      return !normalizePassword(pw).toLowerCase().includes(name);
    },
  },
  {
    id: "REPEATED",
    appliesToEmpty: false,
    passes: (pw) => !FOUR_IN_A_ROW.test(normalizePassword(pw)),
  },
  {
    id: "SEQUENTIAL",
    appliesToEmpty: false,
    passes: (pw) => !OBVIOUS_SEQUENCE.test(normalizePassword(pw)),
  },
];

export type PasswordStrength = {
  ok: boolean;
  problems: PasswordProblem[];
  /** Every rule with its verdict, so the form can tick them off live. */
  rules: { id: PasswordProblem; ok: boolean }[];
};

/**
 * Strength policy for every password an admin picks. Deliberately strict: the
 * panel can delete the whole guest list, and the only thing in front of it is
 * this password.
 */
export function checkPasswordStrength(
  password: string,
  username?: string
): PasswordStrength {
  const pw = typeof password === "string" ? password : "";
  const empty = pw.length === 0;

  const rules = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    ok: empty && !rule.appliesToEmpty ? true : rule.passes(pw, username),
  }));

  const problems = rules.filter((r) => !r.ok).map((r) => r.id);
  return { ok: problems.length === 0, problems, rules };
}

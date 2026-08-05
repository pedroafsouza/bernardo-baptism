import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
  checkPasswordStrength,
  normalizePassword,
} from "../lib/passwordPolicy";
import { hashPassword, verifyPassword } from "../lib/password";

test("a genuinely strong password passes every rule", () => {
  const result = checkPasswordStrength("Kirke-Hund!2026", "admin");
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.equal(result.rules.length, PASSWORD_RULES.length);
  assert.ok(result.rules.every((r) => r.ok));
});

test("a symbol is recognised whatever the symbol is", () => {
  for (const symbol of ["!", "?", "#", "-", "_", "@", "€", " ", "…", "🙂"]) {
    const pw = `Barnedaab${symbol}2026x`;
    const { problems } = checkPasswordStrength(pw);
    assert.ok(
      !problems.includes("NO_SYMBOL"),
      `${JSON.stringify(symbol)} should count as a symbol`
    );
  }
});

test("Danish letters are letters, not symbols", () => {
  // The old ASCII-only test accepted "å" as a symbol, so a password of nothing
  // but letters and digits sailed through.
  const { problems } = checkPasswordStrength("Barnedåbenaa1");
  assert.ok(problems.includes("NO_SYMBOL"));

  const withSymbol = checkPasswordStrength("Barnedåben-å1x");
  assert.ok(!withSymbol.problems.includes("NO_SYMBOL"));
  assert.ok(!withSymbol.problems.includes("NO_LOWERCASE"));
  assert.ok(!withSymbol.problems.includes("NO_UPPERCASE"));
});

test("a missing lowercase letter is actually reported", () => {
  // The old check ran against an already-lowercased copy and could never fail.
  const { problems } = checkPasswordStrength("BARNEDAAB-2026");
  assert.ok(problems.includes("NO_LOWERCASE"));
  assert.ok(!problems.includes("NO_UPPERCASE"));
});

test("each rule fails on its own case", () => {
  const cases: Record<string, string> = {
    TOO_SHORT: "Ab1!xy",
    NO_UPPERCASE: "barnedaab-2026",
    NO_DIGIT: "Barnedaab-abcx",
    NO_SYMBOL: "Barnedaab20261",
    REPEATED: "Baaaarnedaab-1X",
    SEQUENTIAL: "Barnedaab-1234X",
  };
  for (const [expected, password] of Object.entries(cases)) {
    const { problems } = checkPasswordStrength(password);
    assert.ok(
      problems.includes(expected as never),
      `${password} should report ${expected}, got ${problems.join(", ") || "nothing"}`
    );
  }
});

test("the username may not hide inside the password", () => {
  assert.ok(
    checkPasswordStrength("Xadministrator-1", "administrator").problems.includes(
      "CONTAINS_USERNAME"
    )
  );
  // Short usernames would match almost anything, so they are not screened.
  assert.ok(
    !checkPasswordStrength("Kirke-Hund!2026", "ab").problems.includes(
      "CONTAINS_USERNAME"
    )
  );
});

test("common passwords are rejected however they are cased", () => {
  assert.ok(checkPasswordStrength("Password123").problems.includes("COMMON"));
});

test("length is measured at the boundary", () => {
  const exact = "Aa1!" + "bcxyz".repeat(2).slice(0, MIN_PASSWORD_LENGTH - 4);
  assert.equal(exact.length, MIN_PASSWORD_LENGTH);
  assert.ok(!checkPasswordStrength(exact).problems.includes("TOO_SHORT"));
  assert.ok(checkPasswordStrength(exact.slice(1)).problems.includes("TOO_SHORT"));
  assert.ok(
    checkPasswordStrength("Aa1!" + "bcxyz".repeat(60)).problems.includes("TOO_LONG")
  );
});

test("an empty box shows requirements rather than a wall of red", () => {
  const { rules, problems } = checkPasswordStrength("");
  const failed = rules.filter((r) => !r.ok).map((r) => r.id);
  assert.deepEqual(failed.slice().sort(), problems.slice().sort());
  // Nothing typed yet: only the character requirements are outstanding.
  assert.ok(!problems.includes("COMMON"));
  assert.ok(!problems.includes("SEQUENTIAL"));
  assert.ok(problems.includes("TOO_SHORT"));
});

test("every rule reports a verdict, in a stable order", () => {
  const { rules } = checkPasswordStrength("Kirke-Hund!2026");
  assert.deepEqual(
    rules.map((r) => r.id),
    PASSWORD_RULES.map((r) => r.id)
  );
});

test("a password is one password however it is composed", async () => {
  const decomposed = "Kirke-Hu\u030And!2026"; // "n" plus a combining ring above
  const composed = decomposed.normalize("NFKC");
  assert.equal(normalizePassword(decomposed), composed);

  const stored = await hashPassword(decomposed);
  assert.equal(await verifyPassword(composed, stored), true);
});

test("the correct password verifies and a wrong one does not", async () => {
  const stored = await hashPassword("Kirke-Hund!2026");
  assert.equal(await verifyPassword("Kirke-Hund!2026", stored), true);
  assert.equal(await verifyPassword("Kirke-Hund!2027", stored), false);
  assert.equal(await verifyPassword("Kirke-Hund!2026", "nonsense"), false);
});

test("two identical passwords never share a hash", async () => {
  const a = await hashPassword("Kirke-Hund!2026");
  const b = await hashPassword("Kirke-Hund!2026");
  assert.notEqual(a, b);
  assert.ok(a.startsWith("scrypt$"));
});

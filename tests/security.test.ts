import { strict as assert } from "node:assert";
import { test } from "node:test";

import { containsMaliciousInput, safeInt, safePassword } from "../lib/security";

/**
 * The injection screen protects fields that end up in queries, pages and
 * links. Passwords are only ever hashed, and the characters the screen looks
 * for — dashes, hashes, braces — are exactly the ones a strong password is
 * supposed to contain.
 */
test("a strong password is not mistaken for an injection attempt", () => {
  for (const password of [
    "Kirke--Hund#2026",
    "Barnedåb${2026}!x",
    "Select-From-Where!7",
    "/*Bernardo*/-2026x",
    "Drop Table Kirke!9",
  ]) {
    assert.equal(
      containsMaliciousInput({ currentPassword: password, newPassword: password }),
      false,
      `${password} should be accepted`
    );
    assert.equal(containsMaliciousInput({ password }), false);
    assert.equal(safePassword(password), password);
  }
});

test("the same characters in an ordinary field are still blocked", () => {
  assert.equal(containsMaliciousInput({ name: "Kirke'; drop table Guest" }), true);
  assert.equal(containsMaliciousInput({ name: "<script>alert(1)</script>" }), true);
  assert.equal(containsMaliciousInput({ guestCode: "../../etc/passwd" }), true);
});

test("a hostile key is blocked even next to an exempt one", () => {
  assert.equal(containsMaliciousInput({ "<script>": "x", password: "Aa1!aaaaaaaa" }), true);
});

test("passwords are bounded, never trimmed", () => {
  assert.equal(safePassword("  spaces kept  "), "  spaces kept  ");
  assert.equal(safePassword(""), null);
  assert.equal(safePassword("x".repeat(201)), null);
  assert.equal(safePassword(12345), null);
});

test("safeInt clamps rather than trusting the caller", () => {
  assert.equal(safeInt("3", 0, 5, 1), 3);
  assert.equal(safeInt(9, 0, 5, 1), 5);
  assert.equal(safeInt(-2, 0, 5, 1), 0);
  assert.equal(safeInt("nonsense", 0, 5, 1), 1);
  assert.equal(safeInt(undefined, 0, 5, 1), 1);
});

import test from "node:test";
import assert from "node:assert/strict";
import { inviteCodeFromName } from "@/lib/inviteCode";
import { SEED_GUESTS } from "@/prisma/guests";
import { splitGuestNames } from "@/lib/names";

test("a couple becomes a portmanteau of both names", () => {
  assert.equal(inviteCodeFromName("Bibi and Pedro"), "BIBIPEDR");
  assert.equal(inviteCodeFromName("Kitt og Jan"), "KITTJAN");
});

test("somebody invited alone borrows Bernardo's ending", () => {
  assert.equal(inviteCodeFromName("Louise"), "LOUISEARDO");
});

test("accents and Nordic letters survive as plain A-Z", () => {
  assert.equal(inviteCodeFromName("Rūta and Wes"), "RUTAWES");
  assert.equal(inviteCodeFromName("Søren"), "SORENARDO");
  assert.equal(inviteCodeFromName("Lærke og Nico"), "LAERNICO");
});

test("a taken code is never handed out twice", () => {
  const first = inviteCodeFromName("Bibi and Pedro");
  const second = inviteCodeFromName("Bibi and Pedro", [first]);
  assert.notEqual(second, first);
  assert.equal(second, `${first}2`);
  assert.equal(inviteCodeFromName("Bibi and Pedro", [first, second]), `${first}3`);
});

test("a nameless household still gets a usable code", () => {
  assert.equal(inviteCodeFromName("   "), "GUEST");
  assert.equal(inviteCodeFromName("123 456"), "GUEST");
});

test("the seed guest list has no duplicate codes or names", () => {
  const codes = SEED_GUESTS.map((g) => g.guestCode);
  const names = SEED_GUESTS.map((g) => g.name);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(new Set(names).size, names.length);
});

test("every invited household has room for at least one adult", () => {
  for (const guest of SEED_GUESTS) {
    assert.ok(guest.guestCount >= 1, `${guest.name} has no seat`);
    assert.ok(guest.kids >= 0);
    assert.match(guest.guestCode, /^[A-Z0-9]+$/);
  }
});

test("everybody named on an invitation has a seat on it", () => {
  for (const guest of SEED_GUESTS) {
    const named = splitGuestNames(guest.name).length;
    assert.ok(
      named <= guest.guestCount + guest.kids,
      `${guest.name} names ${named} people but seats ${guest.guestCount + guest.kids}`
    );
  }
});

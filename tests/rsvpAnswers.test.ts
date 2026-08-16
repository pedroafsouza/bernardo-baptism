import test from "node:test";
import assert from "node:assert/strict";
import { applyAnswers, fitsInvitation, safeAllergies } from "@/lib/rsvpAnswers";
import type { AttendeeSlot } from "@/lib/attendees";

const household = (): AttendeeSlot[] => [
  { position: 0, name: "Marie", church: "PENDING", reception: "PENDING", allergies: "" },
  { position: 1, name: "Kevin", church: "PENDING", reception: "PENDING", allergies: "" },
];

test("an answer for one person leaves everybody else unanswered", () => {
  const after = applyAnswers(household(), [
    { position: 0, church: "ATTENDING", reception: "ATTENDING" },
  ]);
  assert.deepEqual(
    after.map((p) => [p.church, p.reception]),
    [
      ["ATTENDING", "ATTENDING"],
      ["PENDING", "PENDING"],
    ]
  );
});

test("editing an unrelated field decides nothing for anybody", () => {
  const before = household();
  const after = applyAnswers(before, [{ position: 0 }, { position: 1 }]);
  assert.deepEqual(after, before);
});

test("an answer can be taken back", () => {
  const answered = applyAnswers(household(), [
    { position: 0, church: "ATTENDING", reception: "ATTENDING" },
  ]);
  const undone = applyAnswers(answered, [
    { position: 0, church: "PENDING", reception: "PENDING" },
  ]);
  assert.equal(undone[0]!.church, "PENDING");
  assert.equal(undone[0]!.reception, "PENDING");
});

test("the guest form's plain yes/no still says yes and no", () => {
  const after = applyAnswers(household(), [
    { position: 0, church: true, reception: false },
    { position: 1, church: false, reception: false },
  ]);
  assert.deepEqual(
    after.map((p) => [p.church, p.reception]),
    [
      ["ATTENDING", "DECLINED"],
      ["DECLINED", "DECLINED"],
    ]
  );
});

test("allergies survive an answer that does not mention them", () => {
  const eating = applyAnswers(household(), [
    { position: 0, church: "ATTENDING", reception: "ATTENDING", allergies: "Nuts" },
  ]);
  const later = applyAnswers(eating, [{ position: 0, church: "DECLINED" }]);
  assert.equal(later[0]!.allergies, "Nuts");
});

test("somebody who is not eating with us has no allergies", () => {
  const after = applyAnswers(household(), [
    { position: 0, reception: "DECLINED", allergies: "Nuts" },
  ]);
  assert.equal(after[0]!.allergies, "");
});

test("an answer for a person who is not on the invitation is ignored", () => {
  const after = applyAnswers(household(), [
    { position: 7, church: "ATTENDING", reception: "ATTENDING" },
  ]);
  assert.deepEqual(after, household());
});

test("allergies are trimmed to what we store, not rejected", () => {
  assert.equal(safeAllergies("  Gluten  "), "Gluten");
  assert.equal(safeAllergies(42), "");
  assert.equal(safeAllergies("x".repeat(500)).length <= 300, true);
});

test("an answer never exceeds the invitation, part by part", () => {
  const fitted = fitsInvitation(
    { churchCount: 5, churchKids: 4, guestCount: 5, kids: 4, status: "ATTENDING" },
    { maxGuests: 2, maxKids: 1 }
  );
  assert.deepEqual(fitted, {
    churchCount: 2,
    churchKids: 1,
    guestCount: 2,
    kids: 1,
    status: "ATTENDING",
  });
});

test("nobody at a part means no children at that part", () => {
  const fitted = fitsInvitation(
    { churchCount: 0, churchKids: 2, guestCount: 2, kids: 1, status: "ATTENDING" },
    { maxGuests: 2, maxKids: 2 }
  );
  assert.equal(fitted.churchKids, 0);
  assert.equal(fitted.kids, 1);
});

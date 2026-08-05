import { strict as assert } from "node:assert";
import { test } from "node:test";

import { clampParty, headcount, normalizeCapacity } from "../lib/capacity";

const invite = (maxGuests: number, maxKids: number) => ({ maxGuests, maxKids });

test("an invitation always seats at least one adult", () => {
  assert.deepEqual(normalizeCapacity({ maxGuests: 0, maxKids: 0 }), {
    maxGuests: 1,
    maxKids: 0,
  });
  assert.deepEqual(normalizeCapacity(undefined), { maxGuests: 1, maxKids: 0 });
  assert.deepEqual(normalizeCapacity({ maxGuests: -3, maxKids: -2 }), {
    maxGuests: 1,
    maxKids: 0,
  });
});

test("nobody may bring more people than the invitation allows", () => {
  assert.deepEqual(clampParty({ guestCount: 5, kids: 4 }, invite(2, 1)), {
    guestCount: 2,
    kids: 1,
  });
});

test("a household invited without children can never register any", () => {
  assert.deepEqual(clampParty({ guestCount: 2, kids: 3 }, invite(2, 0)), {
    guestCount: 2,
    kids: 0,
  });
});

test("an answer inside the invitation is left alone", () => {
  assert.deepEqual(clampParty({ guestCount: 1, kids: 2 }, invite(2, 2)), {
    guestCount: 1,
    kids: 2,
  });
});

test("declining clears the whole party", () => {
  assert.deepEqual(
    clampParty({ guestCount: 2, kids: 2 }, invite(2, 2), { attending: false }),
    { guestCount: 0, kids: 0 }
  );
});

test("junk numbers fall back instead of poisoning the count", () => {
  assert.deepEqual(
    clampParty({ guestCount: NaN, kids: "2" as unknown as number }, invite(3, 3)),
    { guestCount: 0, kids: 2 }
  );
  assert.deepEqual(clampParty({ guestCount: 2.9, kids: -1 }, invite(3, 3)), {
    guestCount: 2,
    kids: 0,
  });
});

test("the head count only counts confirmed guests", () => {
  const guests = [
    { status: "ATTENDING", guestCount: 2, kids: 1, maxGuests: 2, maxKids: 1 },
    { status: "DECLINED", guestCount: 2, kids: 2, maxGuests: 2, maxKids: 2 },
    { status: "PENDING", guestCount: 2, kids: 2, maxGuests: 2, maxKids: 2 },
    { status: "ATTENDING", guestCount: 1, kids: 0, maxGuests: 1, maxKids: 0 },
  ];
  assert.deepEqual(headcount(guests), { adults: 3, kids: 1, total: 4 });
});

test("an answer given before the invitation shrank is trimmed in the totals", () => {
  // Two adults and two children were confirmed; the invitation was later cut to
  // one adult and no children, and the final numbers must follow.
  const guests = [
    { status: "ATTENDING", guestCount: 2, kids: 2, maxGuests: 1, maxKids: 0 },
  ];
  assert.deepEqual(headcount(guests), { adults: 1, kids: 0, total: 1 });
});

test("an empty guest list counts nobody", () => {
  assert.deepEqual(headcount([]), { adults: 0, kids: 0, total: 0 });
});

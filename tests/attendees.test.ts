import test from "node:test";
import assert from "node:assert/strict";
import {
  adultNames,
  adultSeats,
  attendeeSlots,
  attending,
  partyFromAttendees,
  summarizeAllergies,
  summarizeAttendees,
  type AttendeeSlot,
  type AttendeeStatus,
} from "@/lib/attendees";

test("adultNames splits the household line", () => {
  assert.deepEqual(adultNames({ name: "Marie og Kevin", maxGuests: 2 }), [
    "Marie",
    "Kevin",
  ]);
});

test("adultNames seats everybody the line names, whatever the capacity said", () => {
  // "and", "og", "e" and a comma each mean another person, and each of them
  // answers for themselves — so a capacity set too low cannot drop anybody.
  assert.deepEqual(adultNames({ name: "Marie og Kevin", maxGuests: 1 }), [
    "Marie",
    "Kevin",
  ]);
});

test("adultNames keeps a line it cannot split as one person", () => {
  assert.deepEqual(adultNames({ name: "Familien Hansen", maxGuests: 2 }), [
    "Familien Hansen",
  ]);
});

test("adultNames falls back to a placeholder for an empty line", () => {
  assert.deepEqual(adultNames({ name: "   ", maxGuests: 1 }), ["Guest"]);
});

test("attendeeSlots lays stored answers onto the people of the invitation", () => {
  const slots = attendeeSlots({ name: "Marie og Kevin", maxGuests: 2 }, [
    { position: 1, church: "ATTENDING", reception: "DECLINED", allergies: "nødder" },
  ]);
  assert.deepEqual(slots, [
    { position: 0, name: "Marie", church: "PENDING", reception: "PENDING", allergies: "" },
    {
      position: 1,
      name: "Kevin",
      church: "ATTENDING",
      reception: "DECLINED",
      allergies: "nødder",
    },
  ]);
});

test("attendeeSlots drops rows for people no longer on the line", () => {
  const slots = attendeeSlots({ name: "Marie", maxGuests: 2 }, [
    { position: 0, church: "ATTENDING", reception: "ATTENDING", allergies: "" },
    { position: 1, church: "ATTENDING", reception: "ATTENDING", allergies: "laktose" },
  ]);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].name, "Marie");
});

test("attendeeSlots ignores an unknown status", () => {
  const [slot] = attendeeSlots({ name: "Marie", maxGuests: 1 }, [
    { position: 0, church: "MAYBE", reception: null, allergies: null },
  ]);
  assert.equal(slot.church, "PENDING");
  assert.equal(slot.reception, "PENDING");
  assert.equal(slot.allergies, "");
});

function slot(
  church: AttendeeStatus,
  reception: AttendeeStatus,
  allergies = ""
): AttendeeSlot {
  return { position: 0, name: "Marie", church, reception, allergies };
}

const kevin = (church: AttendeeStatus, reception: AttendeeStatus): AttendeeSlot => ({
  ...slot(church, reception),
  position: 1,
  name: "Kevin",
});

test("attending answers each half of the day on its own", () => {
  const people = [slot("ATTENDING", "DECLINED"), kevin("DECLINED", "ATTENDING")];
  assert.deepEqual(
    attending(people, "church").map((p) => p.name),
    ["Marie"]
  );
  assert.deepEqual(
    attending(people, "reception").map((p) => p.name),
    ["Kevin"]
  );
});

test("partyFromAttendees counts each half separately", () => {
  const party = partyFromAttendees(
    [slot("ATTENDING", "ATTENDING"), kevin("ATTENDING", "DECLINED")],
    { church: 2, reception: 1 }
  );
  assert.deepEqual(party, {
    churchCount: 2,
    churchKids: 2,
    guestCount: 1,
    kids: 1,
    status: "ATTENDING",
  });
});

test("partyFromAttendees counts a church-only reply as coming", () => {
  const party = partyFromAttendees([slot("ATTENDING", "DECLINED")], {
    church: 1,
    reception: 2,
  });
  assert.deepEqual(party, {
    churchCount: 1,
    churchKids: 1,
    guestCount: 0,
    kids: 0,
    status: "ATTENDING",
  });
});

test("partyFromAttendees waits for both halves before deciding a decline", () => {
  const party = partyFromAttendees([slot("DECLINED", "PENDING")], {
    church: 1,
    reception: 1,
  });
  assert.equal(party.status, "PENDING");
});

test("partyFromAttendees declines only once everybody said no to everything", () => {
  const party = partyFromAttendees(
    [slot("DECLINED", "DECLINED"), kevin("DECLINED", "DECLINED")],
    { church: 3, reception: 3 }
  );
  assert.deepEqual(party, {
    churchCount: 0,
    churchKids: 0,
    guestCount: 0,
    kids: 0,
    status: "DECLINED",
  });
});

test("summarizeAttendees names both halves of the day", () => {
  const line = summarizeAttendees([
    slot("ATTENDING", "ATTENDING"),
    kevin("ATTENDING", "DECLINED"),
    { ...slot("PENDING", "PENDING"), position: 2, name: "Ida" },
  ]);
  assert.equal(
    line,
    "Marie: church yes, party yes; Kevin: church yes, party no; Ida: church -, party -"
  );
});

test("summarizeAllergies lists only the people eating with us", () => {
  const line = summarizeAllergies(
    [
      slot("ATTENDING", "ATTENDING", " nødder "),
      { ...kevin("ATTENDING", "DECLINED"), allergies: "laktose" },
    ],
    " ingen mælk "
  );
  assert.equal(line, "Marie: nødder; kids: ingen mælk");
});

test("summarizeAllergies is empty when nobody declared anything", () => {
  assert.equal(summarizeAllergies([slot("ATTENDING", "ATTENDING")], "   "), "");
});

test("everybody named on the line gets a seat of their own to answer from", () => {
  // An invitation stored with too few seats used to drop the people after the
  // last one, so they could never reply at all.
  const household = { name: "Esdras, Vladia e Cecilia", maxGuests: 2 };
  const slots = attendeeSlots(household);
  assert.deepEqual(
    slots.map((s) => s.name),
    ["Esdras", "Vladia", "Cecilia"]
  );
  assert.equal(adultSeats(household), 3);
});

test("a spare seat for somebody unnamed is kept", () => {
  assert.equal(adultSeats({ name: "Ricardo and Karen", maxGuests: 3 }), 3);
  assert.equal(adultSeats({ name: "Ana Luisa", maxGuests: 2 }), 2);
  assert.equal(adultSeats({ name: "Helene", maxGuests: 1 }), 1);
});

test("each of them answers for themselves", () => {
  const household = { name: "Kitt og Jan", maxGuests: 2 };
  const slots = attendeeSlots(household, [
    { position: 0, church: "ATTENDING", reception: "ATTENDING" },
    { position: 1, church: "DECLINED", reception: "ATTENDING" },
  ]);
  const party = partyFromAttendees(slots, { church: 0, reception: 0 });
  assert.equal(party.churchCount, 1);
  assert.equal(party.guestCount, 2);
  assert.equal(party.status, "ATTENDING");
});

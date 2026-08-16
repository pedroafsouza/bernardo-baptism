import test from "node:test";
import assert from "node:assert/strict";
import {
  adultNames,
  attendeeSlots,
  partyFromAttendees,
  summarizeAllergies,
  summarizeAttendees,
  type AttendeeSlot,
} from "@/lib/attendees";

test("adultNames splits the household line", () => {
  assert.deepEqual(adultNames({ name: "Marie og Kevin", maxGuests: 2 }), [
    "Marie",
    "Kevin",
  ]);
});

test("adultNames never invents a seat beyond the invitation", () => {
  assert.deepEqual(adultNames({ name: "Marie og Kevin", maxGuests: 1 }), ["Marie"]);
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
    { position: 1, status: "DECLINED", allergies: "nødder" },
  ]);
  assert.deepEqual(slots, [
    { position: 0, name: "Marie", status: "PENDING", allergies: "" },
    { position: 1, name: "Kevin", status: "DECLINED", allergies: "nødder" },
  ]);
});

test("attendeeSlots drops rows for people no longer on the line", () => {
  const slots = attendeeSlots({ name: "Marie", maxGuests: 2 }, [
    { position: 0, status: "ATTENDING", allergies: "" },
    { position: 1, status: "ATTENDING", allergies: "laktose" },
  ]);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].name, "Marie");
});

test("attendeeSlots ignores an unknown status", () => {
  const [slot] = attendeeSlots({ name: "Marie", maxGuests: 1 }, [
    { position: 0, status: "MAYBE", allergies: null },
  ]);
  assert.equal(slot.status, "PENDING");
  assert.equal(slot.allergies, "");
});

function slot(status: AttendeeSlot["status"], allergies = ""): AttendeeSlot {
  return { position: 0, name: "Marie", status, allergies };
}

test("partyFromAttendees counts only the people who said yes", () => {
  const party = partyFromAttendees(
    [slot("ATTENDING"), { ...slot("DECLINED"), position: 1, name: "Kevin" }],
    2
  );
  assert.deepEqual(party, { guestCount: 1, kids: 2, status: "ATTENDING" });
});

test("partyFromAttendees waits for everybody before deciding a decline", () => {
  const party = partyFromAttendees(
    [slot("DECLINED"), { ...slot("PENDING"), position: 1, name: "Kevin" }],
    1
  );
  assert.deepEqual(party, { guestCount: 0, kids: 0, status: "PENDING" });
});

test("partyFromAttendees leaves no children behind when no adult comes", () => {
  const party = partyFromAttendees([slot("DECLINED")], 3);
  assert.deepEqual(party, { guestCount: 0, kids: 0, status: "DECLINED" });
});

test("summarizeAttendees reads as one line per invitation", () => {
  const line = summarizeAttendees([
    slot("ATTENDING"),
    { ...slot("DECLINED"), position: 1, name: "Kevin" },
    { ...slot("PENDING"), position: 2, name: "Ida" },
  ]);
  assert.equal(line, "Marie: yes; Kevin: no; Ida: -");
});

test("summarizeAllergies lists only what people declared", () => {
  const line = summarizeAllergies(
    [slot("ATTENDING", " nødder "), { ...slot("ATTENDING"), position: 1, name: "Kevin" }],
    " ingen mælk "
  );
  assert.equal(line, "Marie: nødder; kids: ingen mælk");
});

test("summarizeAllergies is empty when nobody declared anything", () => {
  assert.equal(summarizeAllergies([slot("ATTENDING")], "   "), "");
});

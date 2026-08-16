import { test } from "node:test";
import assert from "node:assert/strict";

import { listDeclines, countDeclines, partsOf } from "@/lib/adminDeclines";
import type { AttendeeSlot } from "@/lib/attendees";

function person(
  name: string,
  church: AttendeeSlot["church"],
  reception: AttendeeSlot["reception"],
  position = 0
): AttendeeSlot {
  return { position, name, church, reception, allergies: "" };
}

test("a household that said no is named once, not once per person", () => {
  const declines = listDeclines([
    {
      id: "g1",
      name: "Marie and Kevin",
      group: "Friends",
      status: "DECLINED",
      attendees: [
        person("Marie", "DECLINED", "DECLINED"),
        person("Kevin", "DECLINED", "DECLINED", 1),
      ],
    },
  ]);
  assert.equal(declines.length, 1);
  assert.equal(declines[0].name, "Marie and Kevin");
  assert.equal(declines[0].scope, "household");
  assert.equal(declines[0].parts, "both");
});

test("a no taken over the phone still counts as the whole day", () => {
  const declines = listDeclines([
    { id: "g1", name: "Bedstemor", group: "Family", status: "DECLINED" },
  ]);
  assert.equal(declines[0].parts, "both");
});

test("somebody who cannot come is found inside a household that is coming", () => {
  const declines = listDeclines([
    {
      id: "g1",
      name: "Marie and Kevin",
      group: "Friends",
      status: "ATTENDING",
      attendees: [
        person("Marie", "ATTENDING", "ATTENDING"),
        person("Kevin", "DECLINED", "DECLINED", 1),
      ],
    },
  ]);
  assert.equal(declines.length, 1);
  assert.equal(declines[0].name, "Kevin");
  assert.equal(declines[0].scope, "person");
});

test("turning down only the party is not read as turning down the church", () => {
  const declines = listDeclines([
    {
      id: "g1",
      name: "Anna",
      group: "Godparents",
      status: "ATTENDING",
      attendees: [person("Anna", "ATTENDING", "DECLINED")],
    },
  ]);
  assert.equal(declines[0].parts, "reception");
  assert.deepEqual(partsOf(declines[0].parts), ["reception"]);
});

test("a household nobody has answered for is not a refusal", () => {
  const declines = listDeclines([
    {
      id: "g1",
      name: "Ole",
      group: "Work",
      status: "PENDING",
      attendees: [person("Ole", "PENDING", "PENDING")],
    },
  ]);
  assert.deepEqual(declines, []);
});

test("households come before the individuals inside other households", () => {
  const declines = listDeclines([
    {
      id: "g1",
      name: "Anna",
      group: "Godparents",
      status: "ATTENDING",
      attendees: [person("Anna", "DECLINED", "ATTENDING")],
    },
    { id: "g2", name: "Bedstefar", group: "Family", status: "DECLINED" },
  ]);
  assert.deepEqual(
    declines.map((d) => d.name),
    ["Bedstefar", "Anna"]
  );
  assert.equal(countDeclines([]), 0);
});

test("a person without a name falls back to the invitation line", () => {
  const declines = listDeclines([
    {
      id: "g1",
      name: "Familien Sørensen",
      group: "Family",
      status: "ATTENDING",
      attendees: [person("", "DECLINED", "DECLINED")],
    },
  ]);
  assert.equal(declines[0].name, "Familien Sørensen");
});

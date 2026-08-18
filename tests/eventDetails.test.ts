import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * The invitation is configuration. Nothing about a real family may be read
 * from the source, and the public demo link may never repeat what a real
 * deployment was configured with.
 */
const CONFIGURED = {
  child: "Test Barn Testesen",
  ceremonyPlace: "Test Kirke, Testvej 5, 9999 Testby",
  ceremonyTimeEn: "Monday 9 March 2099 at 09:00",
  deadlineEn: "1 March 2099",
};

process.env.NEXT_PUBLIC_EVENT_CHILD = CONFIGURED.child;
process.env.NEXT_PUBLIC_EVENT_CEREMONY_PLACE = CONFIGURED.ceremonyPlace;
process.env.NEXT_PUBLIC_EVENT_CEREMONY_TIME_EN = CONFIGURED.ceremonyTimeEn;
process.env.NEXT_PUBLIC_EVENT_RSVP_DEADLINE_EN = CONFIGURED.deadlineEn;
// A blank variable is the same as an unset one, never an empty invitation.
process.env.NEXT_PUBLIC_EVENT_MOTHER = "   ";

/** Imported inside the tests, so the environment above is read, not an empty one. */
const load = async () => ({
  ...(await import("../lib/config")),
  ...(await import("../lib/eventDetails")),
  ...(await import("../lib/inviteMeta")),
});

test("the event is read from the environment", async () => {
  const { EVENT } = await load();
  assert.equal(EVENT.child, CONFIGURED.child);
  assert.equal(EVENT.ceremonyPlace, CONFIGURED.ceremonyPlace);
  assert.equal(EVENT.ceremonyTimeEn, CONFIGURED.ceremonyTimeEn);
});

test("a missing or blank variable falls back to the fictional christening", async () => {
  const { EVENT, FICTIONAL_EVENT } = await load();
  assert.equal(EVENT.mother, FICTIONAL_EVENT.mother);
  assert.equal(EVENT.receptionPlace, FICTIONAL_EVENT.receptionPlace);
});

test("the fallback event is complete, so an unconfigured build is never blank", async () => {
  const { FICTIONAL_EVENT } = await load();
  for (const [field, value] of Object.entries(FICTIONAL_EVENT)) {
    assert.ok(value.trim().length > 0, `${field} is empty`);
  }
  assert.notEqual(FICTIONAL_EVENT.ceremonyPlace, CONFIGURED.ceremonyPlace);
});

test("the demo link is answered with the fictional event, never the real one", async () => {
  const { EVENT, FICTIONAL_EVENT, eventFor } = await load();
  assert.deepEqual(eventFor(true), FICTIONAL_EVENT);
  assert.deepEqual(eventFor(false), EVENT);
  assert.deepEqual(eventFor(), EVENT);
});

test("the demo preview card names no real church and no real hour", async () => {
  const { FICTIONAL_EVENT, inviteMeta } = await load();

  const demo = inviteMeta("en", "Demo and Friend", true);
  assert.ok(demo.description.includes(FICTIONAL_EVENT.ceremonyPlace));
  assert.ok(!demo.description.includes(CONFIGURED.ceremonyPlace));
  assert.ok(!demo.description.includes(CONFIGURED.ceremonyTimeEn));

  const real = inviteMeta("en", "Kitt og Jan");
  assert.ok(real.description.includes(CONFIGURED.ceremonyPlace));
  assert.ok(real.description.includes(CONFIGURED.deadlineEn));
});

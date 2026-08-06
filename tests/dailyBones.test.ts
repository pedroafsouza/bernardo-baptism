import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  BONES_PER_DAY,
  acceptableBoneDays,
  boneCandidates,
  boneDay,
  dailyBoneCount,
  dailyBones,
  isBoneDay,
} from "../lib/dailyBones";
import { level01 } from "../lib/levels/level01";

const DAY = "2026-10-03";

test("every guest playing on the same day sees the same bones", () => {
  assert.deepEqual(dailyBones(DAY), dailyBones(DAY));
  // Regenerating from the date alone is what lets the server verify a pickup.
  assert.equal(dailyBoneCount(DAY), dailyBones(DAY).length);
});

test("a new day lays the bones out somewhere else", () => {
  const today = dailyBones(DAY);
  const tomorrow = dailyBones("2026-10-04");
  const same = today.filter(([x, y], i) => {
    const other = tomorrow[i];
    return other && other[0] === x && other[1] === y;
  });
  assert.ok(
    same.length < today.length / 2,
    `too many bones stayed put: ${same.length} of ${today.length}`
  );
});

test("a day always has a full set of bones", () => {
  for (const day of ["2026-06-16", "2026-10-03", "2027-01-01"]) {
    assert.equal(dailyBones(day).length, BONES_PER_DAY);
  }
});

test("no two bones ever share a tile", () => {
  const bones = dailyBones(DAY);
  const keys = new Set(bones.map(([x, y]) => `${x}:${y}`));
  assert.equal(keys.size, bones.length);
});

test("a bone is never spawned inside something solid", () => {
  const solid = new Set<string>();
  for (const p of level01.platforms) {
    if (p.move) continue;
    for (let x = p.x0; x <= p.x1; x++) solid.add(`${x}:${p.row}`);
  }
  for (const b of level01.blocks ?? []) solid.add(`${b.tx}:${b.ty}`);
  for (const [x, y] of level01.crosses) solid.add(`${x}:${y}`);

  for (const [x, y] of dailyBones(DAY)) {
    assert.ok(!solid.has(`${x}:${y}`), `bone at ${x},${y} is inside solid geometry`);
  }
});

test("a bone is never spawned over a pit", () => {
  const overPit = new Set<number>();
  for (const [a, b] of level01.pits) {
    for (let x = a; x <= b; x++) overPit.add(x);
  }
  // Pit columns are only reachable via a raft, and rafts are excluded outright,
  // so a bone above a pit would be unreachable.
  for (const [x] of dailyBones(DAY)) {
    assert.ok(!overPit.has(x), `bone at column ${x} hangs over a pit`);
  }
});

test("bones are handed out left to right, so index 0 is the first one met", () => {
  const bones = dailyBones(DAY);
  for (let i = 1; i < bones.length; i++) {
    assert.ok(bones[i]![0] >= bones[i - 1]![0]);
  }
});

test("the candidate pool is comfortably larger than one day's worth", () => {
  assert.ok(boneCandidates(level01).length > BONES_PER_DAY);
});

test("only a real calendar day is accepted", () => {
  assert.equal(isBoneDay("2026-10-03"), true);
  assert.equal(isBoneDay("2026-10-3"), false);
  assert.equal(isBoneDay("yesterday"), false);
  assert.equal(isBoneDay(20261003), false);
  assert.equal(isBoneDay(null), false);
});

test("a run that straddles midnight can still hand its bones in", () => {
  const at = new Date("2026-10-03T12:00:00Z");
  const days = acceptableBoneDays(at);
  assert.equal(days.length, 2);
  assert.equal(days[0], boneDay(at));
  assert.equal(days[1], "2026-10-02");
  assert.ok(!days.includes("2026-10-04"), "tomorrow must never be open");
});

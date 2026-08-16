/**
 * The level is hand-authored data, so these are the rules a human can't hold in
 * their head while nudging tile numbers around. They exist because of a real
 * complaint: "?" blocks sitting a tile or two from the little stepping
 * platforms, which turns one clean jump into a guess.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { level01 } from "@/lib/levels/level01";
import {
  BLOCK_CLEARANCE,
  blockClearances,
  isGroundColumn,
  landingColumns,
  platformTiles,
} from "@/lib/levels/layout";

test("a surprise block is never crowded by a platform you have to land on", () => {
  for (const { tx, clearance } of blockClearances(level01)) {
    assert.ok(
      clearance >= BLOCK_CLEARANCE,
      `block at tile ${tx} is only ${clearance} tiles from a landing spot`
    );
  }
});

test("a surprise block always has ground to jump from", () => {
  for (const b of level01.blocks ?? []) {
    assert.ok(
      isGroundColumn(level01, b.tx),
      `block at tile ${b.tx} hangs over a pit — nowhere to jump from`
    );
  }
});

test("nothing collectible is buried inside a platform", () => {
  const solid = platformTiles(level01);
  for (const [tx, ty] of [...level01.crosses, ...level01.bones]) {
    assert.ok(
      !solid.has(`${tx}:${ty}`),
      `a pickup at ${tx},${ty} is inside a platform tile`
    );
  }
});

test("a tree never grows out of a platform you have to stand on", () => {
  const columns = new Set(landingColumns(level01));
  for (const tx of level01.trees) {
    assert.ok(!columns.has(tx), `tree at tile ${tx} sits on a platform`);
  }
});

test("every block is a bump you can actually reach", () => {
  for (const b of level01.blocks ?? []) {
    // Bernardo clears roughly two and a half tiles; row 8 is the ground.
    assert.ok(b.ty >= 5 && b.ty <= 6, `block at tile ${b.tx} sits on row ${b.ty}`);
  }
});

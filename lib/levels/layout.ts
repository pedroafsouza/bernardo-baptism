/**
 * Level geometry rules that a hand-authored level has to keep.
 *
 * A "?" block is bumped by jumping into it from below, and a stepping platform
 * is reached by jumping onto it. Put the two beside each other and the jump
 * belongs to neither: Bernardo's head finds the block on the way up and he
 * never gets his feet onto the ledge. The fix is simply room — a block needs
 * clear air on both sides of it — and this is where that rule lives so a level
 * can be checked instead of play-tested.
 */
import type { Level } from "@/lib/levels/types";

/**
 * How many tile columns of daylight a "?" block needs between itself and any
 * platform, raft or springboard. Bernardo is one tile wide and jumps about two
 * and a half high, so three columns is enough room to line a bump up on purpose
 * and to run past without one.
 */
export const BLOCK_CLEARANCE = 3;

/**
 * How far a block has to stand from the tall scenery. A tree, a signpost and a
 * flag pole all reach up into the block row, so sharing a column puts the block
 * on top of them — and standing directly beside one still buries half of it
 * behind the canopy or the board.
 */
export const SCENERY_CLEARANCE = 2;

/** The ground row every level is built on. */
export const GROUND_ROW = 8;

/**
 * Everything that stands up off the ground into the block row: trees, the
 * signposts and the flag poles. Ground-level things — footballs, springboards,
 * flowers, tufts of grass — are not included, because a block three tiles above
 * them can never collide.
 */
export function tallSceneryColumns(level: Level): number[] {
  return [...level.trees, ...level.signs.map((s) => s.tile), ...level.flags].sort(
    (a, b) => a - b
  );
}

/**
 * Every column a player can land on: platforms, the whole corridor a drifting
 * raft sweeps, and the springboards.
 */
export function landingColumns(level: Level): number[] {
  const columns = new Set<number>();
  for (const p of level.platforms) {
    const dx = p.move?.dx ?? 0;
    const from = p.x0 + Math.min(0, dx);
    const to = p.x1 + Math.max(0, dx);
    for (let x = from; x <= to; x++) columns.add(x);
  }
  for (const tx of level.bouncePads ?? []) columns.add(tx);
  return [...columns].sort((a, b) => a - b);
}

/** Tiles that are solid because a static platform stands there. */
export function platformTiles(level: Level): Set<string> {
  const tiles = new Set<string>();
  for (const p of level.platforms) {
    if (p.move) continue;
    for (let x = p.x0; x <= p.x1; x++) tiles.add(`${x}:${p.row}`);
  }
  return tiles;
}

/** True when the column is standable ground rather than a pit. */
export function isGroundColumn(level: Level, tx: number): boolean {
  const onGround = level.ground.some(([from, to]) => tx >= from && tx <= to);
  const inPit = level.pits.some(([a, b]) => tx >= a && tx <= b);
  return onGround && !inPit;
}

/** How far each "?" block sits from the nearest thing a player lands on. */
export function blockClearances(level: Level): { tx: number; clearance: number }[] {
  const columns = landingColumns(level);
  return (level.blocks ?? []).map((b) => ({
    tx: b.tx,
    clearance: columns.reduce(
      (best, c) => Math.min(best, Math.abs(c - b.tx)),
      Number.POSITIVE_INFINITY
    ),
  }));
}

/** How far each "?" block sits from the nearest tree, signpost or flag pole. */
export function blockSceneryClearances(
  level: Level
): { tx: number; clearance: number }[] {
  const columns = tallSceneryColumns(level);
  return (level.blocks ?? []).map((b) => ({
    tx: b.tx,
    clearance: columns.reduce(
      (best, c) => Math.min(best, Math.abs(c - b.tx)),
      Number.POSITIVE_INFINITY
    ),
  }));
}

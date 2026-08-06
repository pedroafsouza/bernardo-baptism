/**
 * Daily bones.
 *
 * Oscar has to be fed *every day*, so the treats are not a fixed part of the
 * level any more: a new set is laid out each morning in different places. The
 * layout is derived deterministically from the date, which is what makes the
 * competition fair and the API verifiable:
 *
 *   * every guest opening the game on the same day sees exactly the same bones,
 *     in the same order, so "bone #17" means one thing for everybody;
 *   * the server can regenerate the day's layout from the date alone, so a
 *     collected index is validated instead of trusted, and nobody can claim a
 *     bone that was never there.
 *
 * Positions are chosen only from tiles the generator has proved to be free:
 * open ground, or the top of a static platform. Moving rafts, "?" blocks,
 * blessings, trees, signs, flags, springboards, footballs, the pits and the two
 * buildings are all excluded, so a daily bone can never spawn inside something
 * solid or behind scenery.
 */
import { LEVELS, DEFAULT_LEVEL_ID } from "@/lib/levels/level01";
import type { Level, TilePos } from "@/lib/levels/types";

/** The ground row every level is built on (row 9 is the dirt beneath it). */
const GROUND_ROW = 8;

/** How many treats Oscar gets laid out for him each day. */
export const BONES_PER_DAY = 42;

/** The event lives in Copenhagen, so the day rolls over at Danish midnight. */
export const BONE_TIMEZONE = "Europe/Copenhagen";

/** `YYYY-MM-DD` in the event's timezone — the identity of a day of bones. */
export function boneDay(at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: BONE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    // A runtime without the full ICU data still has to agree with itself.
    return at.toISOString().slice(0, 10);
  }
}

/** True for the strings we accept as a day key. */
export function isBoneDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Yesterday and today are both accepted by the API: a run started just before
 * Danish midnight must still be able to hand in the bones it collected.
 */
export function acceptableBoneDays(at: Date = new Date()): string[] {
  const yesterday = new Date(at.getTime() - 24 * 60 * 60 * 1000);
  return [boneDay(at), boneDay(yesterday)];
}

// ---------------------------------------------------------------- randomness

/** FNV-1a — a tiny, stable string hash. The seed must never drift. */
function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — deterministic, dependency-free, identical in node and browser. */
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------- candidate map

const tileKey = (tx: number, ty: number) => `${tx}:${ty}`;

/**
 * Every tile a bone must never occupy: solid geometry, anything a bone would
 * hide inside, and the columns swept by a drifting raft.
 */
function blockedTiles(level: Level): Set<string> {
  const blocked = new Set<string>();
  const block = (tx: number, ty: number) => blocked.add(tileKey(tx, ty));
  const blockColumn = (tx: number) => {
    for (let ty = 0; ty <= GROUND_ROW; ty++) block(tx, ty);
  };

  for (const p of level.platforms) {
    if (p.move) {
      // A raft sweeps a corridor — keep the whole span of its travel clear.
      const dx = p.move.dx ?? 0;
      const dy = p.move.dy ?? 0;
      for (let x = p.x0 + Math.min(0, dx); x <= p.x1 + Math.max(0, dx); x++) {
        for (let y = p.row + Math.min(0, dy) - 1; y <= p.row + Math.max(0, dy); y++) {
          block(x, y);
        }
      }
    } else {
      for (let x = p.x0; x <= p.x1; x++) block(x, p.row);
    }
  }

  // "?" blocks are solid, and the tile right under one is where the player has
  // to stand to bump it.
  for (const b of level.blocks ?? []) {
    block(b.tx, b.ty);
    block(b.tx, b.ty + 1);
  }

  for (const [x, y] of level.crosses) block(x, y);
  for (const [x, y] of level.decor) block(x, y);

  // Scenery and props that would swallow a treat, or that the player interacts
  // with in a way a bone would get in the way of.
  for (const tx of level.trees) blockColumn(tx);
  for (const s of level.signs) blockColumn(s.tile);
  for (const tx of level.flags) blockColumn(tx);
  for (const tx of level.bouncePads ?? []) blockColumn(tx);
  const ballTiles = level.balls ?? (level.ballTile !== undefined ? [level.ballTile] : []);
  for (const tx of ballTiles) blockColumn(tx);

  // Buildings and the spawn halo, with a little clearance either side.
  const spans: Array<[number, number]> = [
    [level.churchTile - 3, level.churchTile + 4],
    [level.heavenGateTile - 2, level.heavenGateTile + 1],
  ];
  if (level.hospitalTile !== undefined) {
    spans.push([level.hospitalTile - 3, level.hospitalTile + 3]);
  }
  for (const [from, to] of spans) {
    for (let x = from; x <= to; x++) blockColumn(x);
  }

  return blocked;
}

/**
 * All the tiles a bone may legitimately sit on: floating just above open
 * ground, or resting on top of a static platform.
 */
export function boneCandidates(level: Level): TilePos[] {
  const blocked = blockedTiles(level);

  const onGround = new Set<number>();
  for (const [from, to] of level.ground) {
    for (let x = from; x <= to; x++) onGround.add(x);
  }
  for (const [a, b] of level.pits) {
    for (let x = a; x <= b; x++) onGround.delete(x);
  }

  const candidates: TilePos[] = [];
  const seen = new Set<string>();
  const offer = (tx: number, ty: number) => {
    if (tx < 0 || tx >= level.widthTiles || ty < 3) return;
    const key = tileKey(tx, ty);
    if (blocked.has(key) || seen.has(key)) return;
    seen.add(key);
    candidates.push([tx, ty]);
  };

  for (const tx of onGround) offer(tx, GROUND_ROW - 1);
  for (const p of level.platforms) {
    if (p.move) continue;
    for (let x = p.x0; x <= p.x1; x++) offer(x, p.row - 1);
  }

  return candidates.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

// ---------------------------------------------------------------- generation

const CACHE = new Map<string, TilePos[]>();

/**
 * The bones for one day, in a stable order. The index of a bone in this array
 * is its identity: it is what the client reports and what the server stores.
 */
export function dailyBones(day: string, levelId: string = DEFAULT_LEVEL_ID): TilePos[] {
  const cacheKey = `${levelId}|${day}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  const level = LEVELS[levelId] ?? LEVELS[DEFAULT_LEVEL_ID];
  const pool = boneCandidates(level);
  const random = makeRandom(hashSeed(`bernardo|${levelId}|${day}`));

  // Fisher-Yates over a copy, then take the day's share.
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  const picked = shuffled
    .slice(0, Math.min(BONES_PER_DAY, shuffled.length))
    // Left to right, so bone #0 is the first one Bernardo meets and the order
    // stays intuitive in the level and in the audit trail alike.
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  CACHE.set(cacheKey, picked);
  return picked;
}

/** How many bones exist on a given day — the upper bound for a reported index. */
export function dailyBoneCount(day: string, levelId: string = DEFAULT_LEVEL_ID): number {
  return dailyBones(day, levelId).length;
}

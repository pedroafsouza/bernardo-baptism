// Level 01 — "Hvidovre → the Church": a full-length Danish journey. The world is
// now double the original width (132 tiles); the second half mirrors the first
// with more platforming, springboards, footballs and "?" blocks before the
// church finale. Author future stages by copying this shape.
import { F } from "@/lib/gameConstants";
import type { Level } from "@/lib/levels/types";

export const level01: Level = {
  id: "01-hvidovre",
  name: "Hvidovre → the Church",
  biome: "beech",
  widthTiles: 132,

  spawnTile: 2,

  // ground with pits — long gaps (rafts) and short hops
  ground: [
    [0, 13],
    [16, 29],
    [32, 45],
    [48, 63],
    [66, 81],
    [84, 99],
    [102, 113],
    [116, 131],
  ],

  platforms: [
    // reachable blessing platforms (2 tiles above the ground)
    { x0: 9, x1: 11, row: 6 },
    { x0: 23, x1: 25, row: 6 },
    { x0: 41, x1: 43, row: 6 },
    { x0: 70, x1: 72, row: 6 }, // cross #2
    { x0: 121, x1: 123, row: 6 }, // cross #3
    // low stepping platforms for bones
    { x0: 17, x1: 18, row: 7 },
    { x0: 35, x1: 36, row: 7 },
    { x0: 52, x1: 53, row: 6 },
    { x0: 75, x1: 76, row: 7 },
    { x0: 88, x1: 89, row: 7 },
    { x0: 94, x1: 95, row: 6 },
    { x0: 106, x1: 108, row: 6 },
    // drifting rafts that ferry Bernardo across the long pits
    { x0: 29, x1: 30, row: 6, move: { dx: 4, dur: 2600 } },
    { x0: 62, x1: 63, row: 6, move: { dx: 4, dur: 2600 } },
    { x0: 80, x1: 81, row: 6, move: { dx: 4, dur: 2400 } },
    { x0: 98, x1: 99, row: 6, move: { dx: 4, dur: 2600 } },
  ],

  pits: [
    [14, 15],
    [30, 31],
    [46, 47],
    [64, 65],
    [82, 83],
    [100, 101],
    [114, 115],
  ],

  // "?" bonus blocks — bump from below for an extra bone
  blocks: [
    { tx: 13, ty: 6, reward: "bone" },
    { tx: 27, ty: 6, reward: "bone" },
    { tx: 39, ty: 6, reward: "bone" },
    { tx: 57, ty: 6, reward: "bone" },
    { tx: 74, ty: 6, reward: "bone" },
    { tx: 92, ty: 6, reward: "bone" },
    { tx: 109, ty: 6, reward: "bone" },
  ],

  // 3 blessings spread across the whole journey so the full level must be
  // traversed to unlock the church.
  crosses: [
    [10, 5],
    [71, 5],
    [122, 5],
  ],

  bones: [
    [4, 7], [5, 6], [6, 6], [10, 6], [10, 7],
    [17, 6], [18, 6], [21, 7], [24, 6], [24, 7],
    [28, 6], [33, 7], [35, 6], [39, 7], [42, 6],
    [42, 7], [49, 7], [52, 5], [56, 7], [58, 7],
    [67, 7], [69, 6], [71, 6], [73, 7], [75, 6],
    [78, 7], [80, 6], [85, 7], [88, 6], [90, 7],
    [92, 6], [95, 7], [98, 6], [103, 7], [106, 6],
    [108, 7], [110, 6], [113, 7], [117, 7], [120, 6],
    [122, 6], [125, 7],
  ],

  decor: [
    [3, 7, F.bush], [6, 7, F.grassTuft], [8, 7, F.mushroom],
    [12, 7, F.rock], [16, 7, F.leaves], [19, 7, F.bushSmall],
    [22, 7, F.grassTuft], [27, 7, F.mushroom], [29, 7, F.leaves],
    [34, 7, F.bush], [38, 7, F.grassTuft], [44, 7, F.rock],
    [45, 7, F.cactus], [51, 7, F.bushSmall], [55, 7, F.grassTuft],
    [60, 7, F.bush], [67, 7, F.grassTuft], [72, 7, F.mushroom],
    [78, 7, F.rock], [85, 7, F.leaves], [90, 7, F.bushSmall],
    [96, 7, F.grassTuft], [104, 7, F.bush], [110, 7, F.mushroom],
    [118, 7, F.grassTuft], [124, 7, F.leaves],
  ],

  trees: [27, 44, 57, 79, 96, 119],

  flowers: [
    2, 4, 7, 11, 13, 18, 21, 26, 28, 34, 38, 44, 49, 51, 55, 58,
    62, 67, 72, 78, 85, 90, 96, 104, 110, 118, 124, 128,
  ],

  signs: [
    { tile: 31, label: "DANMARK\n03.10.2026", bg: 0xc8102e, fg: 0xffffff },
    { tile: 117, label: "KIRKE\n→", bg: 0xffffff, fg: 0xc8102e },
  ],

  flags: [7, 20, 37, 54, 72, 90, 108, 125],

  heavenGateTile: 2,

  // Hvidovre Hospital pixel-art building near the start (replaces the old sign).
  hospitalTile: 6,

  // springboards that launch Bernardo high into the air. These sit on open
  // ground — clear of platforms and decor, which would otherwise bury them.
  bouncePads: [50, 68, 112],

  // kickable World Cup footballs, on open ground clear of the low platforms
  balls: [22, 86],

  churchTile: 126,

  // Background Danish scenery (world pixels; ground line is y = 384).
  // Placement accounts for parallax: an object at world x with factor f only
  // appears while camera scroll ∈ [(x-viewW)/f, x/f], so far-right landmarks use
  // higher factors / nearer x to stay reachable within the level's scroll range.
  landmarks: [
    // beech woodland over the hills near the start
    { key: "beech", x: 230, y: 388, depth: -21, scrollX: 0.5, scale: 1.0 },
    { key: "beech", x: 700, y: 388, depth: -20, scrollX: 0.5, scale: 0.8, alpha: 0.95 },
    { key: "beech", x: 1500, y: 388, depth: -21, scrollX: 0.5, scale: 0.95 },
    { key: "beech", x: 2150, y: 388, depth: -20, scrollX: 0.5, scale: 0.85, alpha: 0.95 },

    // traditional windmills with turning sails, set on the hills
    { key: "mill", x: 900, y: 354, depth: -18, scrollX: 0.5, scale: 0.85, alpha: 0.97 },
    { key: "millSails", x: 900, y: 261, depth: -17, scrollX: 0.5, scale: 0.85, originY: 0.5, spin: 9000 },
    { key: "mill", x: 1950, y: 354, depth: -18, scrollX: 0.5, scale: 0.78, alpha: 0.97 },
    { key: "millSails", x: 1950, y: 268, depth: -17, scrollX: 0.5, scale: 0.78, originY: 0.5, spin: 10500 },

    // Kallur-style lighthouses standing tall on the coastal shore
    { key: "lighthouse", x: 1300, y: 384, depth: -17, scrollX: 0.6, scale: 0.95 },
    { key: "lighthouse", x: 2650, y: 384, depth: -17, scrollX: 0.6, scale: 0.9 },

    // half-timbered villages on the approach to the church
    { key: "timberHouse", x: 2040, y: 388, depth: -18, scrollX: 0.8, scale: 0.85 },
    { key: "timberHouse", x: 2180, y: 388, depth: -17, scrollX: 0.8, scale: 1.0 },
    { key: "timberHouse", x: 2310, y: 388, depth: -18, scrollX: 0.8, scale: 0.8, alpha: 0.97 },
    { key: "timberHouse", x: 3480, y: 388, depth: -18, scrollX: 0.85, scale: 0.85 },
    { key: "timberHouse", x: 3640, y: 388, depth: -17, scrollX: 0.85, scale: 1.0 },
    { key: "timberHouse", x: 3800, y: 388, depth: -18, scrollX: 0.85, scale: 0.82, alpha: 0.97 },

    // seagulls drifting over the harbour
    { key: "seagull", x: 900, y: 120, depth: -27, scrollX: 0.3, scale: 1.1, drift: true },
    { key: "seagull", x: 1250, y: 95, depth: -27, scrollX: 0.32, scale: 0.9, drift: true },
    { key: "seagull", x: 1600, y: 140, depth: -27, scrollX: 0.28, scale: 1.0, drift: true },
    { key: "seagull", x: 2050, y: 110, depth: -27, scrollX: 0.3, scale: 1.05, drift: true },
    { key: "seagull", x: 2500, y: 130, depth: -27, scrollX: 0.31, scale: 0.95, drift: true },
  ],
};

export const LEVELS: Record<string, Level> = {
  [level01.id]: level01,
};

export const DEFAULT_LEVEL_ID = level01.id;

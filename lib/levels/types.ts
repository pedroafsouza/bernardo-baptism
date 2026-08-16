// Declarative level schema. A Level is pure data consumed by the scene's
// buildLevel(), so new stages are authored as data instead of imperative code.
// Every field maps 1:1 to geometry the MainScene knows how to spawn.

export type Biome = "beech" | "coast" | "harbor";

// Inclusive tile range [from, to] on the ground row; gaps between ranges = pits.
export type GroundRange = [from: number, to: number];

// A solid platform spanning tile columns x0..x1 on the given row. With `move`,
// it becomes a drifting platform that oscillates from its start position.
export type PlatformDef = {
  x0: number;
  x1: number;
  row: number;
  move?: { dx?: number; dy?: number; dur: number };
};

// A "?" bonus block that pops a treat when bumped from below.
export type BlockDef = {
  tx: number;
  ty: number;
  reward: "bone";
};

// [tileX, tileY] anchored collectible/actor positions.
export type TilePos = [tx: number, ty: number];

// A decorative, non-solid tile stamped from the tileset (tx, ty, frame index).
export type DecorDef = [tx: number, ty: number, frame: number];

// A roadside signboard planted on a post.
export type SignDef = {
  tile: number;
  label: string;
  bg: number;
  fg: number;
};

// Pit spanning tiles [a, b] — themed hazard the player falls through.
export type PitDef = [a: number, b: number];

// A background scenery sprite placed in world pixels, layered by parallax.
// Used for large Danish landmarks (windmill, timber houses, lighthouse, beech,
// wildlife) that sit behind the playfield.
export type PropDef = {
  key: string; // texture key
  x: number; // world pixel x
  y: number; // world pixel y (sprite origin is bottom-center unless originY set)
  depth: number;
  scrollX: number; // horizontal parallax factor
  scale?: number;
  alpha?: number;
  originY?: number; // default 1 (stands on the point); use 0.5 for spinning hubs
  spin?: number; // if set, rotates 360° forever over this many ms (windmill sails)
  drift?: boolean; // gentle bob/drift across the sky
};

export type Level = {
  id: string;
  name: string;
  biome: Biome;
  widthTiles: number;

  // where the player (and trailing companion) spawns
  spawnTile: number;

  // terrain
  ground: GroundRange[];
  platforms: PlatformDef[];
  pits: PitDef[];
  blocks?: BlockDef[]; // "?" bonus blocks

  // collectibles
  crosses: TilePos[]; // the 3 Blessings that gate the church
  bones: TilePos[]; // Oscar's treats (a.k.a. coins)

  // set dressing
  decor: DecorDef[];
  trees: number[]; // foreground tree tile columns
  flowers: number[]; // flower tile columns (tint randomised per instance)
  signs: SignDef[];
  flags: number[]; // flag pole tile columns (DK → BR → PE → Straw Hat, cycled)

  // landmarks
  heavenGateTile: number; // start-of-level halo/cloud
  ballTile?: number; // optional single kickable football (legacy)
  balls?: number[]; // optional multiple kickable footballs (tile columns)
  bouncePads?: number[]; // springboard tile columns that launch the player high
  hospitalTile?: number; // Hvidovre Hospital building (backdrop) tile column
  churchTile: number; // finish-line church doorway column

  // optional background scenery (parallax Danish landmarks + wildlife)
  landmarks?: PropDef[];
};

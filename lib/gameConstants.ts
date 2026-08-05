// ---- Shared world constants for the Phaser mini-game ----

export const T = 48; // display tile size
export const SRC_TILE = 64; // source tile size in tiles.png
export const COLS = 12; // columns in tileset
export const WORLD_TILES_W = 132;
export const WORLD_ROWS = 10; // 0..9
export const WORLD_W = WORLD_TILES_W * T; // 3168
export const WORLD_H = WORLD_ROWS * T; // 480
export const DESIGN_H = WORLD_H;

// Tileset frame indices (verified from Kenney redux 64x64)
export const F = {
  grass: 1,
  dirt: 17,
  stoneTop: 3,
  stone: 4,
  rock: 68,
  grassTuft: 70,
  leaves: 81,
  mushroom: 82,
  bush: 178,
  bushSmall: 166,
  cactus: 167,
  doorClosed: 130,
  doorOpen: 118,
  exit: 95,
};

// Kickable football: Arcade Physics separates circular bodies against static
// rectangles unreliably, so the ball uses a bottom-aligned AABB body instead.
export const BALL_TEX = 32;
export const BALL_SIZE = 26;
export const BALL_REST_Y = 8 * T - BALL_TEX / 2; // body bottom sits on the grass line

// Springboard: the texture is 48x31 drawn flush to its bounds and displayed at
// 92% of a tile wide, so it rests exactly on top of the grass line.
export const PAD_H = 31 * 0.92;

// Oscar grows as he is fed: a well-fed dog is a bigger dog.
export const OSCAR_BASE_SCALE = 1.2;
export const OSCAR_MAX_SCALE = 2.1;
export const OSCAR_FULL_AT_BONES = 40;

// Virtual D-pad / keyboard control state shared between React and the scene.
export type Control = {
  left: boolean;
  right: boolean;
  jump: boolean;
  paused: boolean;
};

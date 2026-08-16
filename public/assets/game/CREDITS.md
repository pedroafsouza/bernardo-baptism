# Game Art Credits

The pixel art in `public/assets/game/` comes from **Kenney** (https://kenney.nl)
and the Phaser examples project, released under **Creative Commons CC0 1.0**
(public domain — free for commercial and personal use, no attribution required).

- `tiles.png` — Kenney "Platformer Pack Redux" (64×64 tileset)

## Sky sprites

- `sky.png` + `sky.json` — the sun and the birds. Drawn for this project
  (commissioned pixel art, supplied as a single sheet) and packed here into one
  420×108 Phaser atlas of 26 frames: 7 sun poses, a 12-frame blue-bird
  wingbeat, a 5-frame green-bird wingbeat and 2 perched poses. Left-facing
  birds reuse the same frames flipped, and the flap animations are played with
  `yoyo` so 12 frames cover the full up-and-down stroke. One texture means one
  request, one GPU upload and a single batched draw call for the whole sky.

The main character — **Bernardo the Bear** (with his hero cape) — his dog
**Oscar** (a white Bichon), collectible **treats**, and all props (Danish flag,
World Cup football, trophy, trees, flowers, signs) are drawn procedurally in
`components/game/textures.ts`, so no external character art is bundled.

Thank you to Kenney and the Phaser team for the free assets. 💛

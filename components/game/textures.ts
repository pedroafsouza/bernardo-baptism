// Procedural texture generation for the Phaser scene, extracted from the scene
// factory to keep createMainScene.ts focused on gameplay. Generates every
// baked texture the level uses (sky, clouds, hills, crosses, coins, ball,
// flames, flags, particles, etc). Purely a function of the scene + Phaser.
import { WORLD_H } from "@/lib/gameConstants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateTextures(scene: any, Phaser: any) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // sky gradient (baked as strips — generateTexture ignores fillGradientStyle)
  g.clear();
  const top = Phaser.Display.Color.ValueToColor(0x8fccff);
  const bot = Phaser.Display.Color.ValueToColor(0xfdf1e7);
  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, steps - 1, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, Math.floor((i * WORLD_H) / steps), 64, Math.ceil(WORLD_H / steps) + 1);
  }
  g.generateTexture("sky", 64, WORLD_H);

  // fluffy layered cloud
  g.clear();
  g.fillStyle(0xddeeff, 0.55);
  g.fillEllipse(78, 47, 132, 24);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(28, 38, 20);
  g.fillCircle(58, 29, 26);
  g.fillCircle(92, 33, 24);
  g.fillCircle(122, 42, 17);
  g.fillStyle(0xf4fbff, 1);
  g.fillCircle(50, 25, 14);
  g.fillCircle(83, 24, 13);
  g.fillStyle(0xe9f5ff, 1);
  g.fillEllipse(78, 47, 120, 22);
  g.generateTexture("cloud", 152, 68);

  // distant soft mountains
  g.clear();
  g.fillStyle(0xc9d9ec, 1);
  g.fillTriangle(0, 170, 130, 38, 260, 170);
  g.fillTriangle(190, 170, 330, 58, 470, 170);
  g.fillTriangle(410, 170, 540, 44, 700, 170);
  g.fillStyle(0xeaf4ff, 1);
  g.fillTriangle(104, 64, 130, 38, 158, 64);
  g.fillTriangle(308, 76, 330, 58, 354, 76);
  g.fillTriangle(512, 72, 540, 44, 572, 72);
  g.fillStyle(0xb9cde2, 1);
  g.fillRect(0, 154, 700, 18);
  g.generateTexture("mountains", 700, 172);

  // layered rolling hill bands — sampled curves avoid flat-topped plateaus
  const makeHillBand = (
    key: string,
    color: number,
    shade: number,
    crest: number,
    topBase: number,
    amp: number,
    phase: number
  ) => {
    const w = 920;
    const h = 230;
    g.clear();
    const pts: { x: number; y: number }[] = [{ x: 0, y: h }];
    for (let x = 0; x <= w; x += 46) {
      const y =
        topBase +
        Math.sin(x * 0.012 + phase) * amp +
        Math.sin(x * 0.021 + phase * 0.7) * (amp * 0.42);
      pts.push({ x, y });
    }
    pts.push({ x: w, y: h });
    g.fillStyle(color, 1);
    g.fillPoints(pts as any, true);

    const shadePts: { x: number; y: number }[] = [{ x: 0, y: h }];
    for (let x = 0; x <= w; x += 46) {
      const y =
        topBase +
        34 +
        Math.sin(x * 0.012 + phase + 0.35) * (amp * 0.75) +
        Math.sin(x * 0.019 + phase) * (amp * 0.28);
      shadePts.push({ x, y });
    }
    shadePts.push({ x: w, y: h });
    g.fillStyle(shade, 1);
    g.fillPoints(shadePts as any, true);

    // soft lighter rim just under each crest (subtle, no busy bokeh)
    const rim: { x: number; y: number }[] = [];
    for (let x = 0; x <= w; x += 46) {
      const y =
        topBase +
        Math.sin(x * 0.012 + phase) * amp +
        Math.sin(x * 0.021 + phase * 0.7) * (amp * 0.42);
      rim.push({ x, y: y + 3 });
    }
    for (let x = w; x >= 0; x -= 46) {
      const y =
        topBase +
        Math.sin(x * 0.012 + phase) * amp +
        Math.sin(x * 0.021 + phase * 0.7) * (amp * 0.42);
      rim.push({ x, y: y + 12 });
    }
    g.fillStyle(crest, 0.5);
    g.fillPoints(rim as any, true);
    g.generateTexture(key, w, h);
  };
  makeHillBand("hillFar", 0xd4eab8, 0xc5dfaa, 0xe3f2ca, 92, 22, 0.3);
  makeHillBand("hillMid", 0xbfe0a8, 0xa9d492, 0xd2e9bd, 76, 32, 1.8);
  makeHillBand("hillNear", 0x9fcb83, 0x84b66f, 0xb8d89a, 70, 38, 3.1);

  // single rounded mound for occasional foreground depth accents
  g.clear();
  g.fillStyle(0x8fc074, 1);
  g.fillEllipse(190, 210, 380, 250);
  g.fillStyle(0x79ad65, 1);
  g.fillEllipse(210, 240, 360, 220);
  g.fillStyle(0xa8d08b, 1);
  g.fillEllipse(136, 108, 92, 34);
  g.generateTexture("hill", 380, 220);

  // sun
  g.clear();
  g.fillStyle(0xfff2b0, 0.9);
  g.fillCircle(60, 60, 46);
  g.fillStyle(0xffe27a, 1);
  g.fillCircle(60, 60, 34);
  g.generateTexture("sun", 120, 120);

  // golden cross (the Blessing)
  g.clear();
  g.fillStyle(0xffd34d, 1);
  g.fillRoundedRect(12, 2, 8, 30, 3);
  g.fillRoundedRect(4, 11, 24, 8, 3);
  g.fillStyle(0xfff0a8, 1);
  g.fillRect(14, 4, 3, 26);
  g.fillRect(6, 13, 20, 3);
  g.generateTexture("cross", 32, 34);

  // soft glow (layered, low-alpha → reads as radiance not a disk)
  g.clear();
  g.fillStyle(0xfff3c4, 0.22);
  g.fillCircle(32, 32, 30);
  g.fillStyle(0xffe9a8, 0.28);
  g.fillCircle(32, 32, 20);
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(32, 32, 10);
  g.generateTexture("glow", 64, 64);

  // sparkle
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture("spark", 8, 8);

  // twinkle — a soft 4-point star for blessings/celebration (nicer than a dot)
  g.clear();
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(12, 12, 3.5); // bright core
  g.fillStyle(0xfff0b0, 0.85);
  // four tapered spokes
  g.fillTriangle(12, 0, 9.5, 12, 14.5, 12); // up
  g.fillTriangle(12, 24, 9.5, 12, 14.5, 12); // down
  g.fillTriangle(0, 12, 12, 9.5, 12, 14.5); // left
  g.fillTriangle(24, 12, 12, 9.5, 12, 14.5); // right
  g.generateTexture("twinkle", 24, 24);

  // halo ring — thin stroked circle used for expanding light rings
  g.clear();
  g.lineStyle(5, 0xfff2c4, 1);
  g.strokeCircle(32, 32, 26);
  g.lineStyle(2, 0xffffff, 1);
  g.strokeCircle(32, 32, 26);
  g.generateTexture("ring", 64, 64);

  // pastel tree
  g.clear();
  g.fillStyle(0x9c6b4f, 1);
  g.fillRoundedRect(52, 84, 16, 56, 5);
  g.fillStyle(0x8ac47e, 1);
  g.fillCircle(60, 54, 40);
  g.fillCircle(32, 72, 24);
  g.fillCircle(88, 72, 24);
  g.fillStyle(0xb2e0a0, 1);
  g.fillCircle(50, 44, 20);
  g.fillCircle(72, 60, 14);
  g.generateTexture("tree", 120, 140);

  // flower (white petals — tinted per instance)
  g.clear();
  g.fillStyle(0x6bbf59, 1);
  g.fillRect(11, 9, 2, 13);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6, 8, 4); g.fillCircle(18, 8, 4);
  g.fillCircle(12, 3, 4); g.fillCircle(12, 13, 4);
  g.fillStyle(0xffd85a, 1);
  g.fillCircle(12, 8, 3.4);
  g.generateTexture("flower", 24, 24);

  // little bird
  g.clear();
  g.fillStyle(0x6a7a88, 1);
  g.fillTriangle(0, 10, 12, 2, 12, 8);
  g.fillTriangle(24, 10, 12, 2, 12, 8);
  g.generateTexture("bird", 24, 12);

  // World Cup football — classic black-and-white soccer ball (Telstar)
  g.clear();
  const pent = (cx: number, cy: number, r: number, rot: number) => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * Math.PI * 2) / 5 - Math.PI / 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  };
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 15);
  g.fillStyle(0x1b1b1b, 1);
  // center pentagon
  g.fillPoints(pent(16, 16, 5.6, 0) as any, true);
  // five pentagons around the equator
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const cx = 16 + Math.cos(a) * 11;
    const cy = 16 + Math.sin(a) * 11;
    g.fillPoints(pent(cx, cy, 3.2, a + Math.PI) as any, true);
  }
  // seams linking the center pentagon to the outer ring
  g.lineStyle(1.3, 0x1b1b1b, 1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5 + Math.PI / 5;
    g.lineBetween(
      16 + Math.cos(a) * 5.4, 16 + Math.sin(a) * 5.4,
      16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13
    );
  }
  g.lineStyle(1.6, 0x2a2a2a, 1);
  g.strokeCircle(16, 16, 14.5);
  // glossy highlight
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(11, 10, 6, 4);
  g.generateTexture("ball", 32, 32);

  // hellfire flame (rises from the pits -> Buenos Aires)
  g.clear();
  g.fillStyle(0xff3b20, 0.95);
  g.fillPoints(
    [
      { x: 12, y: 40 }, { x: 3, y: 24 }, { x: 7, y: 27 },
      { x: 10, y: 10 }, { x: 12, y: 2 }, { x: 14, y: 10 },
      { x: 17, y: 27 }, { x: 21, y: 24 },
    ] as any,
    true
  );
  g.fillStyle(0xff9a1e, 1);
  g.fillPoints(
    [
      { x: 12, y: 40 }, { x: 6, y: 26 }, { x: 10, y: 18 },
      { x: 12, y: 9 }, { x: 14, y: 18 }, { x: 18, y: 26 },
    ] as any,
    true
  );
  g.fillStyle(0xffe14d, 1);
  g.fillPoints(
    [
      { x: 12, y: 38 }, { x: 9, y: 26 }, { x: 12, y: 17 },
      { x: 15, y: 26 },
    ] as any,
    true
  );
  g.generateTexture("flame", 24, 42);

  // golden trophy
  g.clear();
  g.fillStyle(0xffd34d, 1);
  g.fillRoundedRect(9, 4, 14, 12, 4);
  g.fillRect(12, 15, 8, 7);
  g.fillRoundedRect(8, 22, 16, 4, 2);
  g.fillStyle(0xfff0a8, 1);
  g.fillRect(13, 6, 3, 9);
  g.fillStyle(0xffd34d, 1);
  g.fillEllipse(5, 9, 6, 10);
  g.fillEllipse(27, 9, 6, 10);
  g.generateTexture("trophy", 32, 28);

  // confetti particle
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 6, 6);
  g.generateTexture("confetti", 6, 6);

  // treat (a bone for Oscar the dog)
  g.clear();
  g.fillStyle(0xf3e9c9, 1);
  g.fillCircle(6, 5, 5); g.fillCircle(6, 11, 5);
  g.fillCircle(22, 5, 5); g.fillCircle(22, 11, 5);
  g.fillRect(6, 4, 16, 8);
  g.fillStyle(0xe4d6ac, 1);
  g.fillRect(6, 10, 16, 2);
  g.fillStyle(0xfff8e6, 1);
  g.fillRect(9, 5, 10, 2);
  g.generateTexture("treat", 28, 16);

  // Oscar — the little Bichon companion now uses an animated sprite sheet
  // (loaded in preload as "oscar"); no procedural texture needed here.

  // ---------------------------------------------------------------------------
  // Danish landscape landmarks (background scenery, placed via Level.landmarks)
  // ---------------------------------------------------------------------------

  // Beech tree — tall, lush Danish beech (richer greens than the pastel `tree`)
  g.clear();
  g.fillStyle(0x8a7a58, 1);
  g.fillRoundedRect(60, 96, 14, 58, 4);
  g.fillStyle(0x9c8c66, 1);
  g.fillRect(64, 100, 4, 50);
  g.fillStyle(0x3f6b32, 1);
  g.fillCircle(67, 58, 42);
  g.fillCircle(34, 78, 26);
  g.fillCircle(100, 78, 26);
  g.fillStyle(0x527f3f, 1);
  g.fillCircle(58, 46, 26);
  g.fillCircle(84, 62, 22);
  g.fillCircle(44, 66, 18);
  g.fillStyle(0x6fa054, 1);
  g.fillCircle(54, 40, 16);
  g.fillCircle(78, 52, 13);
  g.generateTexture("beech", 134, 156);

  // Half-timbered (bindingsværk) Danish house — cream infill, dark timber, tile roof
  g.clear();
  // red tile roof
  g.fillStyle(0xb5432c, 1);
  g.fillPoints(
    [
      { x: 4, y: 44 }, { x: 60, y: 8 }, { x: 116, y: 44 },
    ] as any,
    true
  );
  g.fillStyle(0x8f3422, 1);
  g.fillRect(4, 42, 112, 5); // eave shadow
  // cream wall
  g.fillStyle(0xf1e2bf, 1);
  g.fillRect(12, 47, 96, 71);
  // timber frame
  g.fillStyle(0x5a3a22, 1);
  g.fillRect(12, 47, 6, 71); // left post
  g.fillRect(102, 47, 6, 71); // right post
  g.fillRect(57, 47, 6, 71); // center post
  g.fillRect(12, 47, 96, 6); // top beam
  g.fillRect(12, 80, 96, 5); // mid rail
  g.fillRect(12, 113, 96, 5); // sill beam
  // diagonal braces
  g.lineStyle(4, 0x5a3a22, 1);
  g.lineBetween(18, 80, 40, 53);
  g.lineBetween(80, 53, 102, 80);
  // windows
  g.fillStyle(0x9cc0dd, 1);
  g.fillRect(26, 90, 22, 18);
  g.fillRect(72, 90, 22, 18);
  g.lineStyle(2, 0x5a3a22, 1);
  g.lineBetween(37, 90, 37, 108);
  g.lineBetween(26, 99, 48, 99);
  g.lineBetween(83, 90, 83, 108);
  g.lineBetween(72, 99, 94, 99);
  // door
  g.fillStyle(0x7a4a24, 1);
  g.fillRect(28, 58, 20, 24);
  g.fillStyle(0xffd34d, 1);
  g.fillCircle(45, 70, 1.6);
  g.generateTexture("timberHouse", 120, 120);

  // Traditional Danish windmill — tower body (sails are a separate texture)
  g.clear();
  g.fillStyle(0x6a4a30, 1);
  g.fillPoints(
    [
      { x: 10, y: 150 }, { x: 26, y: 26 }, { x: 64, y: 26 }, { x: 80, y: 150 },
    ] as any,
    true
  );
  // plank shading
  g.fillStyle(0x553a24, 1);
  g.fillRect(30, 30, 3, 118);
  g.fillRect(45, 28, 3, 120);
  g.fillRect(58, 30, 3, 118);
  // gallery platform
  g.fillStyle(0x3e2b1a, 1);
  g.fillRect(14, 104, 62, 6);
  // door + window
  g.fillStyle(0x2f2013, 1);
  g.fillRect(38, 120, 14, 28);
  g.fillStyle(0xffe9a8, 1);
  g.fillRect(40, 70, 10, 12);
  // white cap dome
  g.fillStyle(0xe9e2d2, 1);
  g.fillEllipse(45, 26, 52, 30);
  g.fillStyle(0xc9c0ad, 1);
  g.fillEllipse(45, 30, 52, 18);
  g.generateTexture("mill", 90, 150);

  // Windmill sails — 4-arm cross with sail cloth (rotated in-scene around center)
  g.clear();
  g.fillStyle(0x4a3320, 1);
  g.fillRect(4, 54, 112, 12); // horizontal arm
  g.fillRect(54, 4, 12, 112); // vertical arm
  // sail cloth panels (cream, offset to one side of each arm)
  g.fillStyle(0xf3e9d0, 1);
  g.fillRect(10, 44, 40, 10); // left-top cloth
  g.fillRect(70, 66, 40, 10); // right-bottom cloth
  g.fillRect(44, 10, 10, 40); // top-right cloth
  g.fillRect(66, 70, 10, 40); // bottom-left cloth
  g.lineStyle(1.5, 0x4a3320, 1);
  g.strokeRect(10, 44, 40, 10);
  g.strokeRect(70, 66, 40, 10);
  g.strokeRect(44, 10, 10, 40);
  g.strokeRect(66, 70, 10, 40);
  g.fillStyle(0x2c1c10, 1);
  g.fillCircle(60, 60, 8); // hub
  g.fillStyle(0x6a4a30, 1);
  g.fillCircle(60, 60, 4);
  g.generateTexture("millSails", 120, 120);

  // Kallur-style lighthouse — red/white banded tower with lantern room
  g.clear();
  const lhBands = [
    { y0: 40, y1: 62, c: 0xffffff },
    { y0: 62, y1: 84, c: 0xd23b2e },
    { y0: 84, y1: 106, c: 0xffffff },
    { y0: 106, y1: 128, c: 0xd23b2e },
    { y0: 128, y1: 150, c: 0xffffff },
    { y0: 150, y1: 168, c: 0xd23b2e },
  ];
  // taper: half-width goes from 9 (top) to 22 (bottom) across y 40..168
  const lhHalf = (y: number) => 9 + ((y - 40) / (168 - 40)) * 13;
  lhBands.forEach((b) => {
    g.fillStyle(b.c, 1);
    g.fillPoints(
      [
        { x: 30 - lhHalf(b.y0), y: b.y0 },
        { x: 30 + lhHalf(b.y0), y: b.y0 },
        { x: 30 + lhHalf(b.y1), y: b.y1 },
        { x: 30 - lhHalf(b.y1), y: b.y1 },
      ] as any,
      true
    );
  });
  // gallery
  g.fillStyle(0x333840, 1);
  g.fillRect(16, 36, 28, 6);
  // lantern room
  g.fillStyle(0x2a2e35, 1);
  g.fillRect(21, 16, 18, 20);
  g.fillStyle(0xffe9a8, 1);
  g.fillRect(24, 20, 12, 12);
  // dome
  g.fillStyle(0xd23b2e, 1);
  g.fillPoints([{ x: 20, y: 16 }, { x: 30, y: 4 }, { x: 40, y: 16 }] as any, true);
  g.fillStyle(0xffd34d, 1);
  g.fillCircle(30, 4, 2);
  g.generateTexture("lighthouse", 60, 172);

  // Seagull — simple resting gull (white body, grey wing, yellow beak)
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(22, 18, 30, 14); // body
  g.fillCircle(9, 12, 6); // head
  g.fillStyle(0xb8c2cc, 1);
  g.fillEllipse(28, 16, 20, 9); // folded wing
  g.fillStyle(0x9aa6b0, 1);
  g.fillTriangle(34, 14, 40, 12, 34, 18); // wing tip
  g.fillStyle(0xf2b134, 1);
  g.fillTriangle(3, 11, 3, 15, -3, 13); // beak
  g.fillStyle(0x2a2a2a, 1);
  g.fillCircle(8, 11, 1.4); // eye
  g.fillStyle(0xf2b134, 1);
  g.fillRect(18, 24, 1.6, 5); // legs
  g.fillRect(24, 24, 1.6, 5);
  g.generateTexture("seagull", 44, 32);

  // ---------------------------------------------------------------------------
  // Gameplay props (sand pit fill, bonus blocks, moving platform)
  // ---------------------------------------------------------------------------

  // Skagen sand — sandy tile used to fill and floor the holes
  g.clear();
  g.fillStyle(0xe6cfa0, 1);
  g.fillRect(0, 0, 48, 48);
  g.fillStyle(0xdcc290, 1);
  g.fillRect(0, 0, 48, 3); // firmer top crust
  g.fillStyle(0xf0dcb4, 1); // light grains
  [[6, 8], [20, 5], [34, 11], [12, 27], [30, 31], [40, 22], [24, 40]].forEach(
    ([x, y]) => g.fillRect(x, y, 3, 3)
  );
  g.fillStyle(0xd2b47e, 1); // dark grains
  [[10, 18], [26, 14], [38, 34], [16, 38], [44, 8]].forEach(([x, y]) =>
    g.fillRect(x, y, 2, 2)
  );
  g.generateTexture("sand", 48, 48);

  // "?" bonus block — bump from below to pop a treat
  g.clear();
  g.fillStyle(0xe89a2c, 1);
  g.fillRoundedRect(2, 2, 44, 44, 5);
  g.fillStyle(0xf4b24a, 1);
  g.fillRoundedRect(4, 4, 40, 14, 4); // top sheen
  g.lineStyle(3, 0x8a5a12, 1);
  g.strokeRoundedRect(2, 2, 44, 44, 5);
  g.fillStyle(0x8a5a12, 1);
  [[8, 8], [40, 8], [8, 40], [40, 40]].forEach(([x, y]) => g.fillCircle(x, y, 2.4));
  // question mark
  g.fillStyle(0xfff3d0, 1);
  g.fillRoundedRect(17, 12, 14, 7, 3); // top bar
  g.fillRoundedRect(25, 15, 6, 9, 2); // right hook
  g.fillRoundedRect(21, 24, 6, 7, 2); // stem
  g.fillCircle(24, 35, 3); // dot
  g.generateTexture("qblock", 48, 48);

  // spent bonus block
  g.clear();
  g.fillStyle(0x9a7b4f, 1);
  g.fillRoundedRect(2, 2, 44, 44, 5);
  g.lineStyle(3, 0x6a5436, 1);
  g.strokeRoundedRect(2, 2, 44, 44, 5);
  g.fillStyle(0x6a5436, 1);
  [[8, 8], [40, 8], [8, 40], [40, 40]].forEach(([x, y]) => g.fillCircle(x, y, 2.4));
  g.fillStyle(0x7d6440, 1);
  g.fillRect(20, 22, 8, 4);
  g.generateTexture("qblockUsed", 48, 48);

  // Floating platform (2 tiles) — grass-topped wooden raft that drifts
  g.clear();
  g.fillStyle(0x8a6a45, 1);
  g.fillRoundedRect(2, 10, 92, 22, 6);
  g.fillStyle(0x6f5436, 1);
  g.fillRect(4, 20, 88, 12);
  g.fillStyle(0x7fbf5e, 1);
  g.fillRoundedRect(0, 0, 96, 15, 6);
  g.fillStyle(0x9ad277, 1);
  g.fillRoundedRect(0, 0, 96, 6, 6);
  g.generateTexture("floatPlatform", 96, 34);

  // Bounce pad — a springy trampoline that launches the player skyward.
  // The artwork is drawn flush to the texture bounds (cushion at the very top,
  // base plate at the very bottom) so the sprite can be seated exactly on the
  // grass line without floating above it or sinking into it.
  g.clear();
  // spring coils
  g.lineStyle(3, 0x9aa6b0, 1);
  for (const sx of [12, 36]) {
    g.beginPath();
    g.moveTo(sx - 5, 25);
    for (let k = 0; k < 4; k++) {
      g.lineTo(sx + 5, 21 - k * 4);
      g.lineTo(sx - 5, 17 - k * 4);
    }
    g.strokePath();
  }
  // base plate
  g.fillStyle(0x5a3a1b, 1);
  g.fillRoundedRect(2, 23, 44, 8, 3);
  // springy top cushion (Dannebrog red + cream)
  g.fillStyle(0xc8102e, 1);
  g.fillRoundedRect(0, 0, 48, 16, 7);
  g.fillStyle(0xe23a52, 1);
  g.fillRoundedRect(2, 1, 44, 6, 5); // sheen
  g.fillStyle(0xfff0e0, 1);
  g.fillRoundedRect(6, 4, 36, 4, 2); // cream stripe
  g.generateTexture("bouncePad", 48, 31);

  // ---------------------------------------------------------------------------
  // Danish floor — replaces the Kenney grass/dirt tiles (whose scalloped bottom
  // edge produced the "weird triangles"). A warm terracotta running-bond brick
  // body with cream mortar, capped by a bright grass surface, mirroring the
  // "floor like Danish ones" reference block.
  // ---------------------------------------------------------------------------
  const F_MORTAR = 0xe7d7ac;
  const F_BRICK = 0xb14a2e;
  const F_BRICK_HI = 0xc86645;
  const F_BRICK_LO = 0x8b3a22;
  const COURSE = 16; // brick course height
  const BW = 24; // brick width
  const MORT = 3; // mortar thickness

  // Draw terracotta running-bond bricks into the vertical band [topY, botY).
  // `parity` shifts alternate courses to keep a continuous bond across tiles.
  const drawBrickBand = (topY: number, botY: number, parity: number) => {
    g.fillStyle(F_BRICK, 1);
    g.fillRect(0, topY, 48, botY - topY);
    let course = 0;
    for (let y = topY; y < botY; y += COURSE, course++) {
      const off = (course + parity) % 2 ? BW / 2 : 0;
      // brick face shading
      g.fillStyle(F_BRICK_HI, 1);
      g.fillRect(0, y + MORT, 48, 2); // sunlit top of course
      g.fillStyle(F_BRICK_LO, 1);
      g.fillRect(0, y + COURSE - 2, 48, 2); // shaded base of course
      // horizontal mortar joint
      g.fillStyle(F_MORTAR, 1);
      g.fillRect(0, y, 48, MORT);
      // vertical mortar joints (running bond)
      for (let x = off - BW; x < 48; x += BW) {
        g.fillRect(x, y + MORT, MORT - 1, COURSE - MORT);
      }
    }
  };

  // Surface tile: grass cap + cream band + brick body.
  g.clear();
  drawBrickBand(18, 48, 0);
  // grass block
  g.fillStyle(0x66a848, 1);
  g.fillRect(0, 0, 48, 16); // grass underside (darker)
  g.fillStyle(0x7cc154, 1);
  g.fillRect(0, 0, 48, 12); // grass body
  g.fillStyle(0x93d76c, 1);
  g.fillRect(0, 0, 48, 5); // sunlit top
  // little blades poking up
  g.fillStyle(0x93d76c, 1);
  [4, 19, 33, 44].forEach((x) => g.fillRect(x, -2, 3, 4));
  // grass underside bumps hanging into the cream band
  g.fillStyle(0x66a848, 1);
  [7, 22, 38].forEach((x) => g.fillCircle(x, 16, 3));
  // cream mortar band under the turf
  g.fillStyle(F_MORTAR, 1);
  g.fillRect(0, 16, 48, 3);
  g.fillStyle(0xd9c68f, 1);
  g.fillRect(0, 18, 48, 1); // soft shadow line
  g.generateTexture("groundTop", 48, 48);

  // Body tile: full terracotta brick, continuing the bond, darker toward base.
  g.clear();
  drawBrickBand(0, 48, 1);
  g.fillStyle(0x000000, 0.12);
  g.fillRect(0, 40, 48, 8); // subtle depth toward the bottom
  g.generateTexture("groundBody", 48, 48);

  g.destroy();
}

// The sky layer: gradient, clouds, the sun and the birds.
//
// Every sun and bird frame lives in one small atlas (`/assets/game/sky.png`,
// 420×108) so the whole animated sky is a single texture: one HTTP request, one
// GPU upload, and — because the sprites share that texture and sit on the same
// depth band — a single batched draw call. Motion is tween/animation driven, so
// nothing here costs anything per frame in `update()`.
import { T, WORLD_W, WORLD_H } from "@/lib/gameConstants";

// Deliberately *not* "sky": that key belongs to the baked gradient strip, and
// reusing it would silently overwrite the backdrop with an atlas frame.
export const SKY_ATLAS = "skyfx";

/**
 * The sky is drawn far outside the world box on purpose. The camera is clamped
 * to the world, but when the viewport is a different shape than the level (very
 * tall windows, a stale canvas size, a zoom that has not caught up with a
 * resize) it can still show a sliver above y=0 — which used to appear as a bare
 * band above the clouds. Overscanning the backdrop makes that impossible.
 */
export const SKY_OVERSCAN_Y = 700;
export const SKY_OVERSCAN_X = 2200;

/** Top colour of the gradient; also used as the camera clear colour. */
export const SKY_TOP = 0x8fccff;
export const SKY_BOTTOM = 0xfdf1e7;

// Frame order is the animation order: wings from the top of the stroke down to
// the bottom. Played with `yoyo`, that one list is a complete wingbeat.
const BLUE_FLAP = Array.from({ length: 12 }, (_, i) => `bird-blue-${i}`);
const GREEN_FLAP = Array.from({ length: 5 }, (_, i) => `bird-green-${i}`);
const PERCH = ["bird-perch-0", "bird-perch-1"];

type Anim = { key: string; frames: string[]; frameRate: number; yoyo?: boolean; repeat?: number };

const ANIMS: Anim[] = [
  // The sun breathes through its three ray lengths for ever…
  { key: "sun-idle", frames: ["sun-a", "sun-b", "sun-c", "sun-b"], frameRate: 3, repeat: -1 },
  // …and now and then winks at Bernardo or throws off a flare.
  { key: "sun-wink", frames: ["sun-wink-a", "sun-wink-b", "sun-wink-a", "sun-b"], frameRate: 5, repeat: 0 },
  { key: "sun-flare", frames: ["sun-sparkle", "sun-big", "sun-sparkle", "sun-c"], frameRate: 6, repeat: 0 },
  // Full 12-frame wingbeat, yoyoed into a 22-frame loop.
  { key: "bird-blue-flap", frames: BLUE_FLAP, frameRate: 22, yoyo: true, repeat: -1 },
  { key: "bird-blue-glide", frames: BLUE_FLAP.slice(8), frameRate: 4, yoyo: true, repeat: -1 },
  { key: "bird-green-flap", frames: GREEN_FLAP, frameRate: 14, yoyo: true, repeat: -1 },
  { key: "bird-green-glide", frames: GREEN_FLAP.slice(3), frameRate: 3, yoyo: true, repeat: -1 },
  { key: "bird-perch", frames: PERCH, frameRate: 1.4, repeat: -1 },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export function createSkyAnims(scene: any) {
  ANIMS.forEach((a) => {
    if (scene.anims.exists(a.key)) return;
    scene.anims.create({
      key: a.key,
      frames: a.frames.map((frame) => ({ key: SKY_ATLAS, frame })),
      frameRate: a.frameRate,
      yoyo: a.yoyo ?? false,
      repeat: a.repeat ?? -1,
    });
  });
}

/** Gradient backdrop, painted well past the world on every side. */
export function addSkyBackdrop(scene: any) {
  scene.cameras.main.setBackgroundColor(SKY_TOP);
  return scene.add
    .image(-SKY_OVERSCAN_X, -SKY_OVERSCAN_Y, "sky")
    .setOrigin(0, 0)
    .setDisplaySize(WORLD_W + SKY_OVERSCAN_X * 2, WORLD_H + SKY_OVERSCAN_Y * 2)
    .setDepth(-41);
}

/**
 * Clouds across the whole sky — including the band above the world, so the top
 * of a tall viewport is never an empty strip of blue.
 */
export function addClouds(scene: any, Phaser: any) {
  const n = Math.ceil(WORLD_W / 260) + 3;
  for (let i = 0; i < n; i++) {
    const cx = 60 + i * 260 + Phaser.Math.Between(-70, 70);
    // Three bands: high (above the world box), middle and low.
    const band = i % 3;
    const cy = band === 0 ? Phaser.Math.Between(-120, -30) : band === 1 ? Phaser.Math.Between(10, 80) : Phaser.Math.Between(90, 160);
    const cloud = scene.add
      .image(cx, cy, "cloud")
      .setDepth(-30)
      .setScrollFactor(0.18 + (i % 3) * 0.06, 1)
      .setAlpha(0.8 + (i % 2) * 0.14)
      .setScale(Phaser.Math.FloatBetween(0.55, 1.2));
    scene.tweens.add({
      targets: cloud,
      x: cloud.x + 40,
      yoyo: true,
      repeat: -1,
      duration: Phaser.Math.Between(6000, 10000),
      ease: "Sine.inOut",
    });
  }
}

/**
 * The sun: idles for ever, and every so often winks or flares. `scrollFactorY`
 * stays at 1 — the old code passed a single argument, which quietly applied the
 * parallax to the vertical axis too and dragged the sun off the top of the
 * screen on anything but a 480px-tall viewport.
 */
export function addSun(scene: any, Phaser: any) {
  const sun = scene.add
    .sprite(190, 74, SKY_ATLAS, "sun-b")
    .setDepth(-36)
    .setScrollFactor(0.08, 1)
    .setScale(1.15);
  sun.play("sun-idle");

  scene.tweens.add({
    targets: sun,
    y: sun.y + 7,
    yoyo: true,
    repeat: -1,
    duration: 5200,
    ease: "Sine.inOut",
  });

  const cheer = () => {
    sun.play(Phaser.Math.Between(0, 1) ? "sun-wink" : "sun-flare");
    sun.chain("sun-idle");
  };
  scene.time.addEvent({ delay: 7000, loop: true, callback: cheer, startAt: 3000 });

  return sun;
}

/**
 * Birds: small flocks crossing the sky, a couple of lone gliders, and two
 * perched in the hedgerow. Leftward birds reuse the same frames flipped, so
 * both directions get the identical 12-frame wingbeat.
 */
export function addBirds(scene: any, Phaser: any) {
  const flocks = Math.ceil(WORLD_W / 900) + 1;

  const flyer = (x: number, y: number, green: boolean, toLeft: boolean, scale: number, span: number) => {
    const flap = green ? "bird-green-flap" : "bird-blue-flap";
    const bird = scene.add
      .sprite(x, y, SKY_ATLAS, green ? "bird-green-0" : "bird-blue-0")
      .setDepth(-28)
      .setScrollFactor(0.2, 1)
      .setScale(scale)
      .setFlipX(toLeft);
    // Desync the wingbeats. The offset has to stay inside the animation or
    // Phaser refuses to start it — green birds have fewer frames than blue.
    const frames = scene.anims.get(flap).frames.length;
    bird.play({ key: flap, startFrame: Phaser.Math.Between(0, frames - 1) });

    // A long cross-sky drift, with a soft rise and fall on top of it.
    scene.tweens.add({
      targets: bird,
      x: x + (toLeft ? -span : span),
      yoyo: true,
      repeat: -1,
      duration: Phaser.Math.Between(14000, 22000),
      ease: "Sine.inOut",
      onYoyo: () => bird.setFlipX(!toLeft),
      onRepeat: () => bird.setFlipX(toLeft),
    });
    scene.tweens.add({
      targets: bird,
      y: y - Phaser.Math.Between(10, 22),
      yoyo: true,
      repeat: -1,
      duration: Phaser.Math.Between(2600, 4200),
      ease: "Sine.inOut",
    });

    // Every bird stops flapping now and then and coasts.
    scene.time.addEvent({
      delay: Phaser.Math.Between(5000, 9000),
      loop: true,
      callback: () => {
        const glide = green ? "bird-green-glide" : "bird-blue-glide";
        const coasting = bird.anims.getName() === glide;
        bird.play(coasting ? flap : glide);
      },
    });
    return bird;
  };

  for (let f = 0; f < flocks; f++) {
    const base = 260 + f * 900 + Phaser.Math.Between(-120, 120);
    const green = f % 3 === 2;
    const toLeft = f % 2 === 1;
    // A loose V: three birds, the leader highest and furthest ahead.
    for (let i = 0; i < 3; i++) {
      flyer(
        base + i * (toLeft ? 34 : -34) + Phaser.Math.Between(-6, 6),
        // High band on purpose: the flock reads against the top of the sky.
        -30 + i * 20 + Phaser.Math.Between(-14, 14),
        green,
        toLeft,
        Phaser.Math.FloatBetween(0.75, 0.95),
        Phaser.Math.Between(260, 420)
      );
    }
    // A lone bird lower down, bigger, so the sky has depth.
    flyer(
      base + Phaser.Math.Between(300, 520),
      Phaser.Math.Between(90, 170),
      !green,
      !toLeft,
      Phaser.Math.FloatBetween(1, 1.25),
      Phaser.Math.Between(180, 320)
    );
  }

  // Perched birds on the hedge line, hopping about between the two poses.
  for (let x = 620; x < WORLD_W; x += 1400) {
    const perch = scene.add
      .sprite(x + Phaser.Math.Between(-90, 90), 8 * T - 6, SKY_ATLAS, "bird-perch-0")
      .setOrigin(0.5, 1)
      .setDepth(-17)
      .setScrollFactor(0.64, 1)
      .setScale(0.9)
      .setFlipX(Phaser.Math.Between(0, 1) === 1);
    perch.play({ key: "bird-perch", startFrame: Phaser.Math.Between(0, 1) });
    scene.tweens.add({
      targets: perch,
      y: perch.y - 4,
      yoyo: true,
      repeat: -1,
      hold: 900,
      repeatDelay: Phaser.Math.Between(1200, 2600),
      duration: 160,
      ease: "Quad.out",
    });
  }
}

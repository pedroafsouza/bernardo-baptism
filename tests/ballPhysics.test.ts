import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  BALL_RADIUS_PX,
  GRAVITY_PX,
  MAX_KICK_SPEED,
  PX_PER_M,
  RESTITUTION,
  SETTLE_SPEED,
  bounceHeight,
  dragStep,
  impactSpeed,
  kickVelocity,
  liftFactor,
  reboundSpeed,
  rollStep,
  rollingDecel,
  spinRate,
} from "../lib/ballPhysics";

test("the pixel world is scaled by its own gravity", () => {
  // 1500 px/s² is 9.81 m/s², which is what makes every other number here real.
  assert.ok(Math.abs(PX_PER_M * 9.81 - GRAVITY_PX) < 1e-9);
  // A size-5 ball is 22 cm across; ours is close enough to read as one.
  assert.ok((2 * BALL_RADIUS_PX) / PX_PER_M > 0.12);
  assert.ok((2 * BALL_RADIUS_PX) / PX_PER_M < 0.25);
});

test("impact speed follows v² = u² + 2gh", () => {
  // dropped from rest
  assert.equal(impactSpeed(0, 100), Math.sqrt(2 * GRAVITY_PX * 100));
  // already moving downward when it starts to fall
  assert.equal(impactSpeed(200, 50), Math.sqrt(200 ** 2 + 2 * GRAVITY_PX * 50));
  // a fall of nothing changes nothing
  assert.equal(impactSpeed(320, 0), 320);
  // the two are inverses: fall from h, come back to h with no losses
  assert.ok(Math.abs(bounceHeight(impactSpeed(0, 120)) - 120) < 1e-9);
});

test("a bounce keeps only its coefficient of restitution", () => {
  const hit = impactSpeed(0, 200);
  assert.ok(Math.abs(reboundSpeed(hit) - hit * RESTITUTION) < 1e-9);
  // and it therefore comes back to e² of the height it fell from
  assert.ok(Math.abs(bounceHeight(reboundSpeed(hit)) - 200 * RESTITUTION ** 2) < 1e-6);
});

test("the ball settles instead of trembling on the grass", () => {
  // the tiny impacts of a ball resting on the ground give nothing back
  assert.equal(reboundSpeed(20), 0);
  assert.equal(reboundSpeed(SETTLE_SPEED / RESTITUTION - 1), 0);
  assert.ok(reboundSpeed(SETTLE_SPEED / RESTITUTION + 1) > 0);

  // dropped from a tile and a half, it bounces a couple of times and stops
  let speed = impactSpeed(0, 72);
  let bounces = 0;
  while ((speed = reboundSpeed(speed)) > 0) {
    bounces += 1;
    speed = impactSpeed(0, bounceHeight(speed));
    assert.ok(bounces < 10, "a real football does not bounce forever");
  }
  assert.ok(bounces >= 1 && bounces <= 3, `expected a short bounce, got ${bounces}`);
});

test("rolling resistance stops the ball in a plausible distance", () => {
  assert.ok(Math.abs(rollingDecel() - 0.1 * GRAVITY_PX) < 1e-9);

  let vx = 400;
  let travelled = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 20 && vx !== 0; i++) {
    vx = rollStep(vx, dt);
    travelled += vx * dt;
  }
  assert.equal(vx, 0, "a rolling ball must come to rest");
  // s = v² / 2a ≈ 533 px — about eleven tiles of grass
  assert.ok(travelled > 300 && travelled < 800, `rolled ${travelled}px`);
});

test("rolling resistance always opposes the direction of travel", () => {
  assert.ok(rollStep(-400, 1 / 60) > -400);
  assert.ok(rollStep(400, 1 / 60) < 400);
  // it can never push the ball backwards
  assert.equal(rollStep(1, 1), 0);
  assert.equal(rollStep(-1, 1), 0);
});

test("air drag only ever slows the ball, and more so when it is fast", () => {
  const slow = dragStep(100, 0, 1 / 60);
  const fast = dragStep(500, 0, 1 / 60);
  assert.ok(slow.vx < 100 && slow.vx > 0);
  assert.ok(fast.vx < 500);
  assert.ok(500 - fast.vx > 100 - slow.vx, "drag grows with the square of speed");
  // direction is preserved
  const back = dragStep(-300, -200, 1 / 60);
  assert.ok(back.vx < 0 && back.vy < 0);
});

test("running into the ball kicks it harder than standing beside it", () => {
  const still = kickVelocity({ dir: 1, playerSpeed: 0, lift: 0.5 });
  const running = kickVelocity({ dir: 1, playerSpeed: 230, lift: 0.5 });
  assert.ok(running.speed > still.speed);
  // momentum transfer: the ball leaves faster than the boot arrived
  assert.ok(still.speed > 165);
  assert.ok(running.speed <= MAX_KICK_SPEED);
});

test("a kick goes the way the bear is facing, and lofts by where he hits it", () => {
  const right = kickVelocity({ dir: 1, playerSpeed: 200, lift: 1 });
  const left = kickVelocity({ dir: -1, playerSpeed: 200, lift: 1 });
  assert.ok(right.vx > 0 && left.vx < 0);
  assert.equal(right.vx, -left.vx);

  // struck at the base it lifts; stood on it barely leaves the ground
  const low = kickVelocity({ dir: 1, playerSpeed: 200, lift: 1 });
  const top = kickVelocity({ dir: 1, playerSpeed: 200, lift: 0 });
  assert.ok(low.vy < top.vy);
  assert.ok(top.vy < 0, "even a flat kick leaves the grass a little");
  // and the loft stays modest — this is a pass, not a goal kick
  assert.ok(bounceHeight(-low.vy) < 3 * 48);
});

test("where the ball was struck is read off the geometry", () => {
  const centre = 300;
  // feet level with the top of the ball: struck on top
  assert.equal(liftFactor(centre - BALL_RADIUS_PX, centre), 0);
  // feet on the ground beside it: struck at the base
  assert.equal(liftFactor(centre + BALL_RADIUS_PX, centre), 1);
  assert.equal(liftFactor(centre, centre), 0.5);
  // and it never leaves 0..1, however far above or below the bear is
  assert.equal(liftFactor(centre - 500, centre), 0);
  assert.equal(liftFactor(centre + 500, centre), 1);
});

test("spin is rolling without slipping", () => {
  // one radius of travel is one radian of rotation
  assert.equal(spinRate(BALL_RADIUS_PX), 1);
  assert.equal(spinRate(-BALL_RADIUS_PX), -1);
  assert.equal(spinRate(0), 0);
  // a ball rolling one circumference turns exactly once
  const turns = (spinRate(2 * Math.PI * BALL_RADIUS_PX) * 1) / (2 * Math.PI);
  assert.ok(Math.abs(turns - 1) < 1e-9);
});

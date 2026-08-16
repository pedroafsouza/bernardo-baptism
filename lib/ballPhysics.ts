/**
 * The football, done with Newton.
 *
 * The old ball was a toy: every kick sent it off at the same fixed speed and it
 * kept trampolining off the grass because Arcade's restitution never loses the
 * energy a real ball loses. Here the ball is a 430 g size-5 football and the
 * numbers come from the physics rather than from taste:
 *
 *   · a kick is an impulse — momentum is shared between the boot and the ball,
 *     so running into it kicks it further than nudging it while standing still;
 *   · falling obeys `v² = u² + 2gh`, so the speed at which the ball meets the
 *     grass is known exactly and the rebound is that speed times the coefficient
 *     of restitution — a football on turf keeps about half of it, which is why
 *     it only bounces a couple of times and then rolls;
 *   · on the ground it loses speed to rolling resistance (F = μ m g) and in the
 *     air to quadratic drag (F = ½ ρ C_d A v²);
 *   · rolling without slipping means the spin is v / r, so the sprite's
 *     rotation is the real rotation and never a fudge factor.
 *
 * Everything is a pure function of numbers so the model can be unit-tested
 * without booting Phaser, and the scene only has to feed it velocities.
 */

import { BALL_SIZE } from "@/lib/gameConstants";

/** The world's gravity, in pixels per second squared (Phaser's arcade config). */
export const GRAVITY_PX = 1500;

/** Standard gravity. The pair below is what fixes the game's pixel-to-metre scale. */
export const G = 9.81;

/** ≈153 px per metre: the scale implied by the world's gravity. */
export const PX_PER_M = GRAVITY_PX / G;

/** FIFA size-5 ball: 430 g. */
export const BALL_MASS = 0.43;

export const BALL_RADIUS_PX = BALL_SIZE / 2;
export const BALL_RADIUS_M = BALL_RADIUS_PX / PX_PER_M;

/**
 * Coefficient of restitution of a football on grass. Measured values sit around
 * 0.5–0.6: half the impact speed comes back, which is exactly why a dropped
 * ball bounces knee-high, then ankle-high, and then rolls away.
 */
export const RESTITUTION = 0.5;

/** Sideways knocks (walls, "?" blocks) are duller than a clean vertical drop. */
export const WALL_RESTITUTION = 0.4;

/**
 * Below this rebound speed the bounce is not worth simulating: a real ball at
 * this point is already in contact with the ground, and letting Arcade carry on
 * flipping a few pixels per second is what made the old ball jitter forever.
 */
export const SETTLE_SPEED = 95;

/** Rolling resistance on grass (μ_r). Deceleration is μ_r · g. */
export const ROLLING_RESISTANCE = 0.1;

/** Sliding friction while the ball is still skidding rather than rolling. */
export const GROUND_FRICTION = 0.35;

/** Air: ρ = 1.225 kg/m³, C_d ≈ 0.25 for a modern ball above the drag crisis. */
const AIR_DENSITY = 1.225;
const DRAG_COEFF = 0.25;
const FRONTAL_AREA = Math.PI * BALL_RADIUS_M * BALL_RADIUS_M;

/**
 * a = k · v² with k in 1/m (drag force over mass, divided by v²). Converted to
 * pixels: a[px/s²] = (k / S) · v[px/s]², where S is PX_PER_M.
 */
export const DRAG_K_PX = (0.5 * AIR_DENSITY * DRAG_COEFF * FRONTAL_AREA) / BALL_MASS / PX_PER_M;

/**
 * The effective mass of a kicking leg. A boot is far heavier than the ball,
 * which is why a football leaves the foot faster than the foot was moving.
 */
export const BOOT_MASS = 1.6;

/** The swing of the leg itself: a standing player still puts a foot through it. */
export const BOOT_SWING = 165;

/**
 * Momentum transfer for an elastic-ish collision between the boot and the ball:
 *   v_ball = (1 + e) · m_boot / (m_boot + m_ball) · v_boot
 */
export const KICK_TRANSFER =
  ((1 + RESTITUTION) * BOOT_MASS) / (BOOT_MASS + BALL_MASS);

/** A toddler bear is not Roberto Carlos. */
export const MAX_KICK_SPEED = 620;

/** Loft angles, in degrees: struck on top it stays down, struck low it lifts. */
export const MIN_LOFT_DEG = 4;
export const MAX_LOFT_DEG = 34;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * How fast the ball is travelling after falling `fallPx` from speed `startVy`.
 * Straight out of `v² = u² + 2as` — the one equation that makes a bounce feel
 * right, because the rebound has to be proportional to *this*, not to a guess.
 */
export function impactSpeed(startVy: number, fallPx: number): number {
  return Math.sqrt(Math.max(startVy, 0) ** 2 + 2 * GRAVITY_PX * Math.max(fallPx, 0));
}

/** How high a ball leaving the ground at `speed` will rise: h = v² / 2g. */
export function bounceHeight(speed: number): number {
  return (speed * speed) / (2 * GRAVITY_PX);
}

/**
 * The speed that comes back off the grass. Anything the ball could not lift
 * itself off the ground with is returned as zero, so it settles and rolls
 * instead of buzzing against the floor.
 */
export function reboundSpeed(impact: number, restitution = RESTITUTION): number {
  const out = Math.max(impact, 0) * restitution;
  return out < SETTLE_SPEED ? 0 : out;
}

/** Deceleration from rolling resistance, in px/s² (a = μ_r · g). */
export function rollingDecel(): number {
  return ROLLING_RESISTANCE * GRAVITY_PX;
}

/** Quadratic air drag as a deceleration in px/s² for a speed in px/s. */
export function dragDecel(speed: number): number {
  return DRAG_K_PX * speed * speed;
}

/**
 * One step of ground friction: rolling resistance eats the speed, and a ball
 * that has slowed below a crawl simply stops rather than creeping forever.
 */
export function rollStep(vx: number, dt: number): number {
  const decel = rollingDecel() * dt;
  const speed = Math.abs(vx);
  if (speed <= decel || speed < 6) return 0;
  return vx - Math.sign(vx) * decel;
}

/** One step of air resistance, applied against the direction of travel. */
export function dragStep(vx: number, vy: number, dt: number): { vx: number; vy: number } {
  const speed = Math.hypot(vx, vy);
  if (speed < 1) return { vx, vy };
  const drop = dragDecel(speed) * dt;
  const scale = Math.max(0, 1 - drop / speed);
  return { vx: vx * scale, vy: vy * scale };
}

/**
 * Where on the ball the player struck it, as 0 (right on top — the ball is
 * pressed down and squirts away flat) to 1 (at the base — it is scooped up).
 */
export function liftFactor(feetY: number, ballCenterY: number, radius = BALL_RADIUS_PX): number {
  return clamp((feetY - (ballCenterY - radius)) / (2 * radius), 0, 1);
}

/**
 * The velocity a kick gives the ball. The boot's speed is its own swing plus
 * whatever the player was already carrying, and the ball leaves faster than the
 * boot because the boot is the heavier of the two.
 */
export function kickVelocity(opts: {
  dir: -1 | 1;
  playerSpeed: number;
  lift: number;
}): { vx: number; vy: number; speed: number } {
  const bootSpeed = BOOT_SWING + Math.abs(opts.playerSpeed);
  const speed = Math.min(KICK_TRANSFER * bootSpeed, MAX_KICK_SPEED);
  const lift = clamp(opts.lift, 0, 1);
  const angle = ((MIN_LOFT_DEG + (MAX_LOFT_DEG - MIN_LOFT_DEG) * lift) * Math.PI) / 180;
  return {
    vx: opts.dir * speed * Math.cos(angle),
    vy: -speed * Math.sin(angle),
    speed,
  };
}

/**
 * Rolling without slipping: ω = v / r, in radians per second. The ball's spin
 * is therefore never decorative — it is the same motion as its travel.
 */
export function spinRate(vx: number, radius = BALL_RADIUS_PX): number {
  return vx / radius;
}

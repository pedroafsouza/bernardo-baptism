/**
 * In-memory rate limiting.
 *
 * The site runs as a single Node process behind one server, so a shared Map is
 * an honest fit: no Redis to operate, no extra failure mode, and it survives
 * exactly as long as the process that enforces it. It absorbs the two things
 * that actually threaten this site — someone hammering the admin login with a
 * password list, and a crude flood aimed at the RSVP or score endpoints.
 */

type Bucket = { count: number; resetAt: number };

const BUCKETS = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 20_000;

export type RateRule = { limit: number; windowMs: number };

export const RATE_RULES = {
  /** Any request reaching the app. */
  global: { limit: 600, windowMs: 60_000 },
  /** Anything under /api. */
  api: { limit: 180, windowMs: 60_000 },
  /** Guest-facing writes (RSVP, score). */
  publicWrite: { limit: 30, windowMs: 60_000 },
  /** Password guessing, per IP. */
  login: { limit: 8, windowMs: 15 * 60_000 },
  /** Password guessing, per account. */
  loginAccount: { limit: 10, windowMs: 15 * 60_000 },
  /** Authenticated admin traffic. */
  admin: { limit: 300, windowMs: 60_000 },
  /** Destructive endpoints. */
  destructive: { limit: 5, windowMs: 60_000 },
} satisfies Record<string, RateRule>;

export type RateResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfter: number;
  resetAt: number;
};

function sweep(now: number) {
  if (BUCKETS.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of BUCKETS) {
    if (bucket.resetAt <= now) BUCKETS.delete(key);
  }
  // Still full: the map is under active abuse, so drop it wholesale rather than
  // let it grow into a memory-exhaustion vector of its own.
  if (BUCKETS.size >= MAX_TRACKED_KEYS) BUCKETS.clear();
}

export function rateLimit(key: string, rule: RateRule): RateResult {
  const now = Date.now();
  sweep(now);

  const existing = BUCKETS.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + rule.windowMs };
    BUCKETS.set(key, bucket);
    return {
      ok: true,
      remaining: rule.limit - 1,
      limit: rule.limit,
      retryAfter: 0,
      resetAt: bucket.resetAt,
    };
  }

  existing.count += 1;
  const ok = existing.count <= rule.limit;
  return {
    ok,
    remaining: Math.max(0, rule.limit - existing.count),
    limit: rule.limit,
    retryAfter: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
    resetAt: existing.resetAt,
  };
}

/** Clears a counter after a legitimate outcome, e.g. a successful login. */
export function resetRateLimit(key: string) {
  BUCKETS.delete(key);
}

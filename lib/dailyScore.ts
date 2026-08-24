/**
 * Day-by-day scoring.
 *
 * The leaderboard used to hold a single number — a household's best run ever —
 * which meant that coming back the next day and playing well added nothing at
 * all once the first good run was on record. Oscar has to be fed *every* day,
 * so the standings have to reward every day.
 *
 * The rule is one row per household per day, holding that day's best run, and a
 * total that is the sum of those rows:
 *
 *   * a new day always adds — its row starts at zero and whatever is played
 *     lands on top of the days before it;
 *   * replaying a day cannot inflate anything — it only ever raises that one
 *     day's row, and only when the run was actually better.
 *
 * It is the same shape as the bones (`lib/dailyBones.ts`), which are also kept
 * per day and deduplicated, so the two halves of the competition agree.
 */

/** One day's best run, as stored and as summed. */
export type DailyRun = {
  bones: number;
  blessings: number;
  finished: boolean;
  score: number;
};

/**
 * Whether a fresh run replaces the one already on record for that day.
 *
 * The score decides it. Ties are broken by what a guest would say is the better
 * run anyway — reaching the church, then treats, then blessings — so handing in
 * an equal-scoring but plainly better run is not silently discarded.
 */
export function beatsDay(next: DailyRun, current: DailyRun | null | undefined): boolean {
  if (!current) return true;
  if (next.score !== current.score) return next.score > current.score;
  if (next.finished !== current.finished) return next.finished;
  if (next.bones !== current.bones) return next.bones > current.bones;
  return next.blessings > current.blessings;
}

/** The leaderboard figure: every day this household played, added up. */
export function totalScore(days: Pick<DailyRun, "score">[]): number {
  return days.reduce((sum, d) => sum + Math.max(0, d.score), 0);
}

/**
 * The single best day, for the "your best run" line next to the total. Never
 * null for a household that has played; null before the first run.
 */
export function bestRun(days: DailyRun[]): DailyRun | null {
  return days.reduce<DailyRun | null>(
    (best, day) => (beatsDay(day, best) ? day : best),
    null
  );
}

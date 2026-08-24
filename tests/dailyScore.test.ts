import test from "node:test";
import assert from "node:assert/strict";
import { beatsDay, bestRun, totalScore, type DailyRun } from "../lib/dailyScore";
import { computeScore } from "../lib/config";

const run = (bones: number, blessings: number, finished = false): DailyRun => ({
  bones,
  blessings,
  finished,
  score: computeScore(bones, blessings, finished),
});

test("a day with nothing on record is always beaten", () => {
  assert.equal(beatsDay(run(1, 0), null), true);
  assert.equal(beatsDay(run(0, 0), undefined), true);
});

test("only a better run replaces the day already on record", () => {
  const today = run(10, 1);
  assert.equal(beatsDay(run(11, 1), today), true);
  assert.equal(beatsDay(run(9, 1), today), false);
  // The same run handed in twice — a retry, a second tab — changes nothing.
  assert.equal(beatsDay(run(10, 1), today), false);
});

test("an equal score is broken by the plainly better run", () => {
  // 5 treats and a blessing scores the same as 15 treats; the blessing run is
  // not thrown away for it, and vice versa.
  const treats = run(15, 0);
  const blessing = run(5, 1);
  assert.equal(treats.score, blessing.score);
  assert.equal(beatsDay(treats, blessing), true, "more treats wins the tie");
  assert.equal(beatsDay(blessing, treats), false);

  // Reaching the church outranks everything else at an equal score.
  const arrived = { ...run(10, 0), finished: true };
  const stopped = { ...run(10, 0), finished: false };
  assert.equal(beatsDay(arrived, stopped), true);
  assert.equal(beatsDay(stopped, arrived), false);
});

test("every day played adds to the total", () => {
  const monday = run(10, 0);
  const tuesday = run(4, 1);
  const wednesday = run(20, 3, true);

  assert.equal(totalScore([monday]), monday.score);
  assert.equal(totalScore([monday, tuesday]), monday.score + tuesday.score);
  assert.equal(
    totalScore([monday, tuesday, wednesday]),
    monday.score + tuesday.score + wednesday.score
  );
});

test("a household that has not played yet stands at zero", () => {
  assert.equal(totalScore([]), 0);
  assert.equal(bestRun([]), null);
});

test("replaying one day only ever raises that day, never the days beside it", () => {
  const monday = run(10, 0);
  let tuesday = run(3, 0);
  const before = totalScore([monday, tuesday]);

  // A worse replay of Tuesday is discarded; the total does not move.
  const worse = run(1, 0);
  if (beatsDay(worse, tuesday)) tuesday = worse;
  assert.equal(totalScore([monday, tuesday]), before);

  // A better one lifts Tuesday by the difference — and only by that.
  const better = run(8, 0);
  if (beatsDay(better, tuesday)) tuesday = better;
  assert.equal(totalScore([monday, tuesday]), monday.score + better.score);
});

test("the best single run is the best day, not the sum of them", () => {
  const days = [run(10, 0), run(30, 2, true), run(5, 1)];
  const best = bestRun(days);
  assert.equal(best?.bones, 30);
  assert.equal(best?.blessings, 2);
  assert.equal(best?.finished, true);
  assert.notEqual(best?.score, totalScore(days));
});

test("a negative score can never drag a total down", () => {
  assert.equal(totalScore([{ score: -500 }, { score: 100 }]), 100);
});

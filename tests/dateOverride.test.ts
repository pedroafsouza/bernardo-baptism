import { strict as assert } from "node:assert";
import { test } from "node:test";

import { getCurrentDate, resetDateOverride } from "../lib/dateOverride";
import { acceptableBoneDays, boneDay } from "../lib/dailyBones";

/** Runs `fn` with `OVERRIDE_DATE` (and `NODE_ENV`) set, then puts them back. */
function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const before: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    before[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  resetDateOverride();
  try {
    fn();
  } finally {
    for (const key of Object.keys(env)) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    resetDateOverride();
  }
}

test("without the variable the server uses the real clock", () => {
  withEnv({ OVERRIDE_DATE: undefined }, () => {
    const drift = Math.abs(getCurrentDate().getTime() - Date.now());
    assert.ok(drift < 5_000, `unexpected drift of ${drift}ms`);
  });
});

test("an overridden date is the day the bones are laid out for", () => {
  withEnv({ OVERRIDE_DATE: "2026-09-07", NODE_ENV: "development" }, () => {
    assert.equal(boneDay(getCurrentDate()), "2026-09-07");
    // The default argument reads the override too, which is what the API relies on.
    assert.equal(boneDay(), "2026-09-07");
    assert.deepEqual(acceptableBoneDays(), ["2026-09-07", "2026-09-06"]);
  });
});

test("the override lands on the named day in winter as well as summer", () => {
  // Copenhagen is always ahead of UTC, so a midnight stamp would be read back
  // as the *next* day. Midday keeps it honest at either end of the year.
  withEnv({ OVERRIDE_DATE: "2026-01-15", NODE_ENV: "development" }, () => {
    assert.equal(boneDay(), "2026-01-15");
  });
  withEnv({ OVERRIDE_DATE: "2026-07-15", NODE_ENV: "development" }, () => {
    assert.equal(boneDay(), "2026-07-15");
  });
});

test("a malformed override is ignored rather than obeyed", () => {
  for (const bad of ["07-09-2026", "2026-9-7", "tomorrow", "   "]) {
    withEnv({ OVERRIDE_DATE: bad, NODE_ENV: "development" }, () => {
      const drift = Math.abs(getCurrentDate().getTime() - Date.now());
      assert.ok(drift < 5_000, `"${bad}" should have been ignored`);
    });
  }
});

test("a date the calendar does not have is ignored", () => {
  withEnv({ OVERRIDE_DATE: "2026-02-31", NODE_ENV: "development" }, () => {
    const drift = Math.abs(getCurrentDate().getTime() - Date.now());
    assert.ok(drift < 5_000, "31 February should have been ignored");
  });
});

test("production never time-travels, however the variable got there", () => {
  withEnv({ OVERRIDE_DATE: "2199-09-07", NODE_ENV: "production" }, () => {
    assert.notEqual(boneDay(), "2199-09-07");
    const drift = Math.abs(getCurrentDate().getTime() - Date.now());
    assert.ok(drift < 5_000, "an override leaked into production");
  });
});

test("the override is read once, not on every call", () => {
  withEnv({ OVERRIDE_DATE: "2026-09-07", NODE_ENV: "development" }, () => {
    assert.equal(boneDay(), "2026-09-07");
    process.env.OVERRIDE_DATE = "2026-09-08";
    assert.equal(boneDay(), "2026-09-07");
    resetDateOverride();
    assert.equal(boneDay(), "2026-09-08");
  });
});

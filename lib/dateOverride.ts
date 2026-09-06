/**
 * Pretending it is another day.
 *
 * The standings are cumulative: every day a household plays adds its best run
 * to the total. Testing that honestly would mean waiting for real midnights, so
 * `OVERRIDE_DATE=YYYY-MM-DD` moves the server's idea of "today".
 *
 *   OVERRIDE_DATE=2026-09-07 npm run dev
 *
 * Two deliberate limits:
 *
 *  - It is a *server* switch. The variable is not `NEXT_PUBLIC_`, so it is
 *    never baked into the browser bundle; the client asks the API which day it
 *    is instead (see `components/InvitationApp.tsx`).
 *  - It is ignored in production. A variable left behind in a deployment would
 *    quietly freeze the whole event on a single day, which is a much worse
 *    failure than not being able to time-travel on a live server.
 */

/** Resolved once per process — `boneDay()` runs on every request. */
let resolved: { override: Date | null } | null = null;

function parseOverride(): Date | null {
  // `process` is stubbed out in the browser bundle, so this guards a module
  // that is also reachable from client code.
  if (typeof process === "undefined" || !process.env) return null;

  const raw = process.env.OVERRIDE_DATE?.trim();
  if (!raw) return null;

  if (process.env.NODE_ENV === "production") {
    console.warn(`OVERRIDE_DATE ("${raw}") is ignored in production — using the real date.`);
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    console.warn(`OVERRIDE_DATE "${raw}" is not YYYY-MM-DD — using the real date.`);
    return null;
  }

  // Midday UTC, not midnight. The day is read back out in `Europe/Copenhagen`,
  // which is always ahead of UTC, so a midnight stamp would be read as the
  // *next* date. Midday lands safely in the middle of the intended day.
  const date = new Date(`${raw}T12:00:00Z`);
  // `2026-02-31` parses — into the 3rd of March. Reading the day back out is
  // the only way to tell a real date from one that quietly rolled over.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    console.warn(`OVERRIDE_DATE "${raw}" is not a real date — using the real date.`);
    return null;
  }

  console.log(`OVERRIDE_DATE is set: the server is pretending it is ${raw}.`);
  return date;
}

/** "Now", unless this server was told to pretend it is some other day. */
export function getCurrentDate(): Date {
  if (resolved === null) resolved = { override: parseOverride() };
  return resolved.override ? new Date(resolved.override) : new Date();
}

/** Test seam — forgets the cached value so a changed variable is read again. */
export function resetDateOverride(): void {
  resolved = null;
}

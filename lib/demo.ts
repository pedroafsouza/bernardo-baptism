/**
 * Demo invitation — `/?code=DEMO`.
 *
 * The demo code behaves exactly like a real guest link (invitation, game,
 * scoring, RSVP) but is never written to the database: every API route answers
 * it from memory, so it is safe to share publicly, works with an empty
 * database, and can never pollute the guest list or the leaderboard.
 */
export const DEMO_CODE = "DEMO";

export function isDemoCode(code: unknown): boolean {
  return typeof code === "string" && code.trim().toUpperCase() === DEMO_CODE;
}

export type DemoGuest = {
  guestCode: string;
  name: string;
  status: string;
  guestCount: number;
  kids: number;
  maxGuests: number;
  maxKids: number;
  bones: number;
  blessings: number;
  score: number;
};

/** A fresh, unanswered guest record — nothing here is persisted. */
export function demoGuest(overrides: Partial<DemoGuest> = {}): DemoGuest {
  return {
    guestCode: DEMO_CODE,
    name: "Demo",
    status: "PENDING",
    guestCount: 1,
    kids: 0,
    // generous demo invitation, so every part of the form is reachable
    maxGuests: 4,
    maxKids: 2,
    bones: 0,
    blessings: 0,
    score: 0,
    ...overrides,
  };
}

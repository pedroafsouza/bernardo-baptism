/**
 * Admin accounts live in the database (see `lib/adminAuth.ts`), not in the
 * environment: passwords are salted scrypt hashes, sessions are revocable, and
 * administrators are added or removed from the panel itself. A fresh database
 * bootstraps a single `admin` / `admin` account that can do nothing except set
 * a strong password of its own.
 */

import { FICTIONAL_EVENT, type EventDetails } from "@/lib/eventDetails";

/**
 * The real names, hours and addresses are never committed: they are handed to
 * the build as `NEXT_PUBLIC_EVENT_*` variables by the deployment pipeline (see
 * `.env.example`). A missing or blank variable falls back to the fictional
 * christening, so a fresh checkout runs and the site can never invent a wrong
 * address of its own.
 *
 * Each variable is read as a literal `process.env.X`, which is what lets Next
 * substitute it into the browser bundle — the invitation is shown client-side.
 */
const set = (value: string | undefined, fallback: string) => value?.trim() || fallback;

export const EVENT: EventDetails = {
  familyName: set(process.env.NEXT_PUBLIC_EVENT_FAMILY_NAME, FICTIONAL_EVENT.familyName),
  child: set(process.env.NEXT_PUBLIC_EVENT_CHILD, FICTIONAL_EVENT.child),
  birthday: set(process.env.NEXT_PUBLIC_EVENT_BIRTHDAY, FICTIONAL_EVENT.birthday),
  mother: set(process.env.NEXT_PUBLIC_EVENT_MOTHER, FICTIONAL_EVENT.mother),
  father: set(process.env.NEXT_PUBLIC_EVENT_FATHER, FICTIONAL_EVENT.father),
  ceremonyTime: set(process.env.NEXT_PUBLIC_EVENT_CEREMONY_TIME_DA, FICTIONAL_EVENT.ceremonyTime),
  ceremonyTimeEn: set(process.env.NEXT_PUBLIC_EVENT_CEREMONY_TIME_EN, FICTIONAL_EVENT.ceremonyTimeEn),
  ceremonyTimePt: set(process.env.NEXT_PUBLIC_EVENT_CEREMONY_TIME_PT, FICTIONAL_EVENT.ceremonyTimePt),
  ceremonyPlace: set(process.env.NEXT_PUBLIC_EVENT_CEREMONY_PLACE, FICTIONAL_EVENT.ceremonyPlace),
  receptionTime: set(process.env.NEXT_PUBLIC_EVENT_RECEPTION_TIME_DA, FICTIONAL_EVENT.receptionTime),
  receptionTimeEn: set(process.env.NEXT_PUBLIC_EVENT_RECEPTION_TIME_EN, FICTIONAL_EVENT.receptionTimeEn),
  receptionTimePt: set(process.env.NEXT_PUBLIC_EVENT_RECEPTION_TIME_PT, FICTIONAL_EVENT.receptionTimePt),
  receptionPlace: set(process.env.NEXT_PUBLIC_EVENT_RECEPTION_PLACE, FICTIONAL_EVENT.receptionPlace),
  rsvpDeadline: set(process.env.NEXT_PUBLIC_EVENT_RSVP_DEADLINE_DA, FICTIONAL_EVENT.rsvpDeadline),
  rsvpDeadlineEn: set(process.env.NEXT_PUBLIC_EVENT_RSVP_DEADLINE_EN, FICTIONAL_EVENT.rsvpDeadlineEn),
  rsvpDeadlinePt: set(process.env.NEXT_PUBLIC_EVENT_RSVP_DEADLINE_PT, FICTIONAL_EVENT.rsvpDeadlinePt),
  giftList: set(process.env.NEXT_PUBLIC_EVENT_GIFT_LIST, FICTIONAL_EVENT.giftList),
};

/**
 * Which christening a visitor is being shown.
 *
 * The demo link is public — it is pasted into a README, a chat, a browser
 * address bar by anyone — so it is answered with the fictional event. A real
 * guest, holding a real code, sees the real one.
 */
export function eventFor(demo?: boolean): EventDetails {
  return demo ? FICTIONAL_EVENT : EVENT;
}

export type GuestStatus = "PENDING" | "ATTENDING" | "DECLINED";
export const GROUPS = ["Family", "Friends", "Godparents", "Colleagues", "Other"];
export const STATUSES: GuestStatus[] = ["PENDING", "ATTENDING", "DECLINED"];

// ---- Scoring ----
// Every bone Oscar gets is worth points, every blessing is worth a lot more, and
// finishing the run (reaching the church) earns a completion bonus.
export const POINTS_PER_BONE = 10;
export const POINTS_PER_BLESSING = 100;
export const POINTS_FINISH_BONUS = 250;

export function computeScore(bones: number, blessings: number, finished: boolean) {
  return (
    Math.max(0, bones) * POINTS_PER_BONE +
    Math.max(0, Math.min(blessings, 3)) * POINTS_PER_BLESSING +
    (finished ? POINTS_FINISH_BONUS : 0)
  );
}

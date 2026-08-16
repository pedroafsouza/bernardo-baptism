/**
 * The guest list as the administration sees it.
 *
 * Two screens work on the same households — the panel and the printable
 * report — and both of them change the same individual answers. The shape and
 * the requests that move it therefore live here, so the two can never drift
 * into disagreeing about what a household is or how an answer is saved.
 */

import type { AttendeeSlot } from "@/lib/attendees";

export type AdminGuest = {
  id: string;
  guestCode: string;
  name: string;
  group: string;
  status: string;
  maxGuests: number;
  maxKids: number;
  /** The christening and the party are answered — and counted — separately. */
  churchCount: number;
  churchKids: number;
  guestCount: number;
  kids: number;
  kidsAllergies: string;
  /** Who is on this invitation and what each of them answered. */
  attendees: AttendeeSlot[];
  likely: boolean;
  inviteSent: boolean;
  inviteSentAt: string | null;
  bones: number;
  blessings: number;
  score: number;
  playedAt: string | null;
  updatedAt: string;
};

/** The head counts that are not read off the individual answers. */
export type AnswerExtras = {
  churchKids?: number;
  kids?: number;
  kidsAllergies?: string;
};

export type GuestsResult =
  /** Signed in, here is the list. */
  | { ok: true; guests: AdminGuest[] }
  /** Not signed in, or holding a temporary password: the screen must say so. */
  | { ok: false; reason: "UNAUTHORIZED" | "PASSWORD_CHANGE_REQUIRED" | "FAILED" };

export async function fetchGuests(): Promise<GuestsResult> {
  try {
    const res = await fetch("/api/admin/guests", { credentials: "same-origin" });
    if (res.status === 401) return { ok: false, reason: "UNAUTHORIZED" };
    if (res.status === 403) return { ok: false, reason: "PASSWORD_CHANGE_REQUIRED" };
    if (!res.ok) return { ok: false, reason: "FAILED" };
    const data = await res.json();
    return { ok: true, guests: (data.guests ?? []) as AdminGuest[] };
  } catch {
    return { ok: false, reason: "FAILED" };
  }
}

/**
 * Saves what each person on one invitation answered.
 *
 * The three real states are sent as they are, never flattened to a yes or a
 * no: somebody who has not answered has to stay unanswered while the person
 * beside them is ticked off. The server recomputes the household from these
 * people, so the head counts can never disagree with the names behind them.
 */
export async function saveAnswers(
  guest: AdminGuest,
  people: AttendeeSlot[],
  extra: AnswerExtras = {}
): Promise<{ guest: AdminGuest; attendees: AttendeeSlot[] } | null> {
  const res = await fetch("/api/admin/guests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      id: guest.id,
      attendees: people.map((p) => ({
        position: p.position,
        church: p.church,
        reception: p.reception,
        allergies: p.allergies,
      })),
      churchKids: extra.churchKids ?? guest.churchKids,
      kids: extra.kids ?? guest.kids,
      kidsAllergies: extra.kidsAllergies ?? guest.kidsAllergies ?? "",
    }),
  });
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  if (!data?.guest) return null;
  return { guest: data.guest as AdminGuest, attendees: (data.attendees ?? people) as AttendeeSlot[] };
}

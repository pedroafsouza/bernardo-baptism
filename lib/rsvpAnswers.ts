/**
 * Applying an answer to an invitation.
 *
 * A reply can arrive from the guest's own RSVP form or from an administrator
 * answering on the phone on their behalf, and both have to land in exactly the
 * same place: the same people, the same two halves of the day, the same
 * ceiling. This is that one place.
 */
import { safeInt, safeString } from "@/lib/security";
import { clampParty } from "@/lib/capacity";
import {
  MAX_ALLERGY_LENGTH,
  type AttendeeSlot,
  type AttendeeStatus,
  type Party,
} from "@/lib/attendees";

export type PostedAttendee = {
  position?: unknown;
  church?: unknown;
  reception?: unknown;
  allergies?: unknown;
};

/**
 * Allergies are free text somebody types under pressure, so they are trimmed to
 * what we are willing to store rather than rejected for being long. Anything
 * that still looks like an attack has already been refused by `readJson`.
 */
export function safeAllergies(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, MAX_ALLERGY_LENGTH);
  return safeString(trimmed, { max: MAX_ALLERGY_LENGTH }) ?? "";
}

export function answerOf(value: unknown) {
  return value ? ("ATTENDING" as const) : ("DECLINED" as const);
}

/**
 * What a posted value actually says. "Not answered" is a real answer here and
 * must survive: an administrator ticking one person off must never quietly
 * decide for the rest of the household, so anything that is not an explicit
 * yes or no leaves the person exactly as they were.
 */
function statusOf(value: unknown): AttendeeStatus | null {
  if (typeof value === "boolean") return answerOf(value);
  if (value === "ATTENDING" || value === "DECLINED" || value === "PENDING") return value;
  return null;
}

/**
 * Lays the posted answers onto the invitation's real people. Positions we do
 * not know are ignored, so a payload can never add a guest. Allergies belong to
 * the meal, so they are only kept for somebody staying for the party.
 */
export function applyAnswers(
  slots: AttendeeSlot[],
  posted: PostedAttendee[]
): AttendeeSlot[] {
  const byPosition = new Map<number, PostedAttendee>();
  for (const row of posted) {
    const position = safeInt(row?.position, 0, 99, -1);
    if (position >= 0) byPosition.set(position, row);
  }

  return slots.map((slot) => {
    const answer = byPosition.get(slot.position);
    if (!answer) return slot;
    const church = statusOf(answer.church) ?? slot.church;
    const reception = statusOf(answer.reception) ?? slot.reception;
    const allergies =
      "allergies" in answer ? safeAllergies(answer.allergies) : slot.allergies;
    return {
      ...slot,
      church,
      reception,
      // Allergies belong to the meal: nobody who is not eating with us has any.
      allergies: reception === "ATTENDING" ? allergies : "",
    };
  });
}

/**
 * Trims an answer to what the invitation seats — each half of the day on its
 * own, since an invitation for two is an invitation for two at both.
 */
export function fitsInvitation(
  answered: Party,
  capacity: { maxGuests?: number; maxKids?: number }
): Party {
  const church = clampParty(
    { guestCount: answered.churchCount, kids: answered.churchKids },
    capacity,
    { attending: answered.churchCount > 0 }
  );
  const reception = clampParty(answered, capacity, { attending: answered.guestCount > 0 });
  return {
    churchCount: church.guestCount,
    churchKids: church.kids,
    guestCount: reception.guestCount,
    kids: reception.kids,
    status: answered.status,
  };
}

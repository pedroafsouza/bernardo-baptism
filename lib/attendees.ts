/**
 * Who is coming, person by person.
 *
 * An invitation is addressed to a household — "Marie and Kevin" on one line —
 * but people answer as individuals: Marie can come while Kevin cannot, and each
 * of them has their own allergies. The people on an invitation are derived from
 * the household line itself, never invented, so an invitation can never grow a
 * seat nobody was invited to fill.
 *
 * Everything here is pure so the RSVP form, both APIs and the admin panel agree
 * on exactly who is on an invitation and what the household therefore answered.
 */
import { splitGuestNames } from "@/lib/names";
import { normalizeCapacity } from "@/lib/capacity";

export type AttendeeStatus = "PENDING" | "ATTENDING" | "DECLINED";

/** A person on an invitation, with whatever they have answered so far. */
export type AttendeeSlot = {
  position: number;
  name: string;
  status: AttendeeStatus;
  allergies: string;
};

/** The shape stored in the database (and posted back by the RSVP form). */
export type StoredAttendee = {
  position: number;
  name?: string | null;
  status?: string | null;
  allergies?: string | null;
};

type Household = {
  name: string;
  maxGuests?: number | null;
};

export const MAX_ALLERGY_LENGTH = 200;

function isStatus(value: unknown): value is AttendeeStatus {
  return value === "PENDING" || value === "ATTENDING" || value === "DECLINED";
}

/**
 * The adults on an invitation: the names on the household line, never more than
 * the invitation seats. A line we cannot take apart still yields one person, so
 * every invitation has somebody to answer for.
 */
export function adultNames(household: Household): string[] {
  const { maxGuests } = normalizeCapacity({ maxGuests: household.maxGuests ?? 1 });
  const names = splitGuestNames(household.name);
  const people = names.length > 0 ? names : [(household.name ?? "").trim() || "Guest"];
  return people.slice(0, maxGuests);
}

/**
 * The people of an invitation with their stored answers laid onto them. Rows
 * for someone who is no longer on the line (a renamed household) are dropped,
 * and a person with no row yet simply has not answered.
 */
export function attendeeSlots(
  household: Household,
  stored: StoredAttendee[] = []
): AttendeeSlot[] {
  const byPosition = new Map<number, StoredAttendee>();
  for (const row of stored) {
    if (Number.isInteger(row?.position)) byPosition.set(row.position, row);
  }

  return adultNames(household).map((name, position) => {
    const row = byPosition.get(position);
    return {
      position,
      name,
      status: isStatus(row?.status) ? row.status : "PENDING",
      allergies: (row?.allergies ?? "").slice(0, MAX_ALLERGY_LENGTH),
    };
  });
}

/**
 * What the household answered, read off the individual replies.
 *
 * Children are counted rather than named, and they cannot come on their own:
 * once every adult has said no, the invitation is a decline and the children go
 * with it.
 */
export function partyFromAttendees(
  slots: AttendeeSlot[],
  kids: number
): { guestCount: number; kids: number; status: "PENDING" | "ATTENDING" | "DECLINED" } {
  const guestCount = slots.filter((s) => s.status === "ATTENDING").length;
  const answered = slots.length > 0 && slots.every((s) => s.status !== "PENDING");

  if (guestCount > 0) {
    return { guestCount, kids: Math.max(0, kids), status: "ATTENDING" };
  }
  return { guestCount: 0, kids: 0, status: answered ? "DECLINED" : "PENDING" };
}

/** "Marie ✓, Kevin ✗" for the admin table and the CSV, in one flat string. */
export function summarizeAttendees(slots: AttendeeSlot[]): string {
  return slots
    .map((s) => `${s.name}: ${s.status === "ATTENDING" ? "yes" : s.status === "DECLINED" ? "no" : "-"}`)
    .join("; ");
}

/** "Marie: nuts; Kevin: lactose" — only the people who declared something. */
export function summarizeAllergies(slots: AttendeeSlot[], kidsAllergies = ""): string {
  const parts = slots
    .filter((s) => s.allergies.trim().length > 0)
    .map((s) => `${s.name}: ${s.allergies.trim()}`);
  const kids = kidsAllergies.trim();
  if (kids) parts.push(`kids: ${kids}`);
  return parts.join("; ");
}

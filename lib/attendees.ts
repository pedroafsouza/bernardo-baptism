/**
 * Who is coming, person by person — and to which part of the day.
 *
 * An invitation is addressed to a household — "Marie and Kevin" on one line —
 * but people answer as individuals: Marie can come while Kevin cannot, and each
 * of them has their own allergies. The people on an invitation are derived from
 * the household line itself, never invented, so an invitation can never grow a
 * seat nobody was invited to fill.
 *
 * The day is two invitations in one — the ceremony and the party afterwards —
 * and they are answered separately: a godparent at the church who cannot stay
 * for dinner, a friend who can only make the party. Every count is therefore
 * kept per part.
 *
 * Everything here is pure so the RSVP form, both APIs and the admin panel agree
 * on exactly who is on an invitation and what the household therefore answered.
 */
import { splitGuestNames } from "@/lib/names";
import { normalizeCapacity } from "@/lib/capacity";

export type AttendeeStatus = "PENDING" | "ATTENDING" | "DECLINED";

/** The two halves of the day, in the order they happen. */
export const PARTS = ["church", "reception"] as const;
export type Part = (typeof PARTS)[number];

/** A person on an invitation, with whatever they have answered so far. */
export type AttendeeSlot = {
  position: number;
  name: string;
  church: AttendeeStatus;
  reception: AttendeeStatus;
  allergies: string;
};

/** The shape stored in the database (and posted back by the RSVP form). */
export type StoredAttendee = {
  position: number;
  name?: string | null;
  church?: string | null;
  reception?: string | null;
  allergies?: string | null;
};

type Household = {
  name: string;
  maxGuests?: number | null;
};

/** The household answer, counted separately for each part of the day. */
export type Party = {
  churchCount: number;
  churchKids: number;
  guestCount: number;
  kids: number;
  status: AttendeeStatus;
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
      church: isStatus(row?.church) ? row.church : "PENDING",
      reception: isStatus(row?.reception) ? row.reception : "PENDING",
      allergies: (row?.allergies ?? "").slice(0, MAX_ALLERGY_LENGTH),
    };
  });
}

/** Everyone who said yes to one part of the day. */
export function attending(slots: AttendeeSlot[], part: Part): AttendeeSlot[] {
  return slots.filter((s) => s[part] === "ATTENDING");
}

/**
 * What the household answered, read off the individual replies.
 *
 * Children are counted rather than named, and they cannot come on their own:
 * where no adult goes, no children go either. A household coming to neither
 * part, once everybody has answered, has declined.
 */
export function partyFromAttendees(
  slots: AttendeeSlot[],
  kids: { church: number; reception: number }
): Party {
  const churchCount = attending(slots, "church").length;
  const guestCount = attending(slots, "reception").length;
  const answered =
    slots.length > 0 &&
    slots.every((s) => s.church !== "PENDING" && s.reception !== "PENDING");

  const status: AttendeeStatus =
    churchCount > 0 || guestCount > 0 ? "ATTENDING" : answered ? "DECLINED" : "PENDING";

  return {
    churchCount,
    churchKids: churchCount > 0 ? Math.max(0, Math.floor(kids.church)) : 0,
    guestCount,
    kids: guestCount > 0 ? Math.max(0, Math.floor(kids.reception)) : 0,
    status,
  };
}

function mark(status: AttendeeStatus): string {
  return status === "ATTENDING" ? "yes" : status === "DECLINED" ? "no" : "-";
}

/**
 * "Marie: church yes, party yes; Kevin: church yes, party no" — one flat line
 * for the admin table and the CSV.
 */
export function summarizeAttendees(slots: AttendeeSlot[]): string {
  return slots
    .map((s) => `${s.name}: church ${mark(s.church)}, party ${mark(s.reception)}`)
    .join("; ");
}

/**
 * "Marie: nuts; Kevin: lactose" — only the people who declared something. The
 * food is at the reception, so only the people eating there are listed.
 */
export function summarizeAllergies(slots: AttendeeSlot[], kidsAllergies = ""): string {
  const parts = slots
    .filter((s) => s.reception === "ATTENDING" && s.allergies.trim().length > 0)
    .map((s) => `${s.name}: ${s.allergies.trim()}`);
  const kids = kidsAllergies.trim();
  if (kids) parts.push(`kids: ${kids}`);
  return parts.join("; ");
}

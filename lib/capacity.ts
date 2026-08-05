/**
 * Invitation capacity.
 *
 * Every invitation is for a fixed household: so many adults, and — for some —
 * no children at all. These helpers are the single place that decides what
 * fits, so the RSVP form, the admin panel, both APIs and the final head count
 * can never quietly disagree about who is coming.
 */

export type Capacity = { maxGuests: number; maxKids: number };
export type Party = { guestCount: number; kids: number };

/** An invitation always seats at least one adult and never negative children. */
export function normalizeCapacity(capacity: Partial<Capacity> | null | undefined): Capacity {
  return {
    maxGuests: Math.max(1, Math.floor(Number(capacity?.maxGuests ?? 1)) || 1),
    maxKids: Math.max(0, Math.floor(Number(capacity?.maxKids ?? 0)) || 0),
  };
}

/**
 * Trims an answer to what the invitation allows. A household invited without
 * children comes back with zero children, whatever it asked for.
 */
export function clampParty(
  party: Partial<Party> | null | undefined,
  capacity: Partial<Capacity> | null | undefined,
  { attending = true }: { attending?: boolean } = {}
): Party {
  if (!attending) return { guestCount: 0, kids: 0 };

  const { maxGuests, maxKids } = normalizeCapacity(capacity);
  const adults = Math.floor(Number(party?.guestCount ?? 0));
  const kids = Math.floor(Number(party?.kids ?? 0));

  return {
    guestCount: Math.min(Math.max(Number.isFinite(adults) ? adults : 0, 0), maxGuests),
    kids: Math.min(Math.max(Number.isFinite(kids) ? kids : 0, 0), maxKids),
  };
}

export type Attendee = Party & Capacity & { status: string };

/**
 * The final head count. Answers stored before a capacity was tightened are
 * trimmed here too, so the caterer never gets a number the invitations do not
 * support.
 */
export function headcount(guests: Attendee[]): {
  adults: number;
  kids: number;
  total: number;
} {
  let adults = 0;
  let kids = 0;

  for (const guest of guests) {
    if (guest.status !== "ATTENDING") continue;
    const party = clampParty(guest, guest);
    adults += party.guestCount;
    kids += party.kids;
  }

  return { adults, kids, total: adults + kids };
}

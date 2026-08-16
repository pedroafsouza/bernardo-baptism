/**
 * Who said no.
 *
 * A "no" is not one thing. A whole household can decline, and inside a
 * household that is coming somebody can still decline for themselves — and
 * either of them can decline only the christening, or only the party. The
 * panel used to show a single number, which told us how many but never who,
 * so this turns the guest list into the actual list of names and what each of
 * them said no to.
 */
import type { AttendeeSlot, Part } from "@/lib/attendees";

type DeclineGuest = {
  id: string;
  name: string;
  group: string;
  status: string;
  attendees?: AttendeeSlot[];
};

/** Which half of the day was turned down — or both. */
export type DeclinedParts = "church" | "reception" | "both" | "none";

export type Decline = {
  /** The invitation this belongs to, so the row can open the household. */
  guestId: string;
  /** The household line, or the person's own name. */
  name: string;
  group: string;
  /** A whole invitation saying no, or one person inside one that is coming. */
  scope: "household" | "person";
  parts: DeclinedParts;
};

function declinedParts(people: AttendeeSlot[]): DeclinedParts {
  const church = people.some((p) => p.church === "DECLINED");
  const reception = people.some((p) => p.reception === "DECLINED");
  if (church && reception) return "both";
  if (church) return "church";
  if (reception) return "reception";
  return "none";
}

function personParts(p: AttendeeSlot): DeclinedParts {
  return declinedParts([p]);
}

/**
 * Every no on the guest list, households first and then the individuals inside
 * households that are otherwise coming.
 *
 * A declining household is listed once under its own line rather than once per
 * person: the invitation said no, and repeating each name under it would make
 * the list read as more refusals than there were. A person is only listed
 * separately when the household around them did not decline — that is the case
 * a head count hides.
 */
export function listDeclines(guests: DeclineGuest[]): Decline[] {
  const households: Decline[] = [];
  const people: Decline[] = [];

  for (const g of guests) {
    const attendees = g.attendees ?? [];
    if (g.status === "DECLINED") {
      // A household can be marked as declined without anybody having ticked a
      // part — an answer taken over the phone — so an unticked answer still
      // means the whole day.
      const parts = declinedParts(attendees);
      households.push({
        guestId: g.id,
        name: g.name,
        group: g.group,
        scope: "household",
        parts: parts === "none" ? "both" : parts,
      });
      continue;
    }
    for (const p of attendees) {
      const parts = personParts(p);
      if (parts === "none") continue;
      people.push({
        guestId: g.id,
        name: p.name || g.name,
        group: g.group,
        scope: "person",
        parts,
      });
    }
  }

  return [...households, ...people];
}

/** How many people, in total, have turned some part of the day down. */
export function countDeclines(guests: DeclineGuest[]): number {
  return listDeclines(guests).length;
}

/** The part names in the order they happen, for rendering a label. */
export function partsOf(parts: DeclinedParts): Part[] {
  if (parts === "both") return ["church", "reception"];
  if (parts === "church") return ["church"];
  if (parts === "reception") return ["reception"];
  return [];
}

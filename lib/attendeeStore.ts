/**
 * Reading and writing the people on an invitation.
 *
 * The people themselves are derived from the household line (`lib/attendees.ts`)
 * — this is only where their answers are stored, so the RSVP route and the
 * admin panel keep exactly one way of putting them on disk.
 */
import { prisma } from "@/lib/prisma";
import { attendeeSlots, type AttendeeSlot } from "@/lib/attendees";

type Household = { guestCode: string; name: string; maxGuests?: number | null };

/** The invitation's people with whatever they have answered so far. */
export async function loadAttendeeSlots(household: Household): Promise<AttendeeSlot[]> {
  const rows = await prisma.attendee.findMany({
    where: { guestCode: household.guestCode },
    orderBy: { position: "asc" },
  });
  return attendeeSlots(household, rows);
}

/**
 * Stores the answers and, in the same breath, drops rows for anyone no longer
 * on the invitation — a household renamed or shrunk in the admin panel must not
 * leave a stranger behind in the final list.
 */
export async function saveAttendeeSlots(
  guestCode: string,
  slots: AttendeeSlot[]
): Promise<void> {
  await prisma.$transaction([
    prisma.attendee.deleteMany({
      where: { guestCode, position: { gte: slots.length } },
    }),
    ...slots.map((slot) =>
      prisma.attendee.upsert({
        where: { guestCode_position: { guestCode, position: slot.position } },
        update: {
          name: slot.name,
          church: slot.church,
          reception: slot.reception,
          allergies: slot.allergies,
        },
        create: {
          guestCode,
          position: slot.position,
          name: slot.name,
          church: slot.church,
          reception: slot.reception,
          allergies: slot.allergies,
        },
      })
    ),
  ]);
}

import { PrismaClient } from "@prisma/client";
import { attendeeSlots, adultSeats, partyFromAttendees } from "../lib/attendees";

const prisma = new PrismaClient();

/**
 * Idempotent repair: every person named on an invitation gets their own seat.
 *
 * An invitation is addressed to a household on one line, and the joining words
 * are what make it more than one person: "Bibi and Pedro", "Kitt og Jan",
 * "Esdras, Vladia e Cecilia". Each of those people answers for themselves — one
 * can come to the church while the other cannot — so each of them needs a row
 * of their own to answer in.
 *
 * Where a stored invitation was given fewer seats than it has names, everybody
 * after the last seat was silently dropped and could never reply. This walks
 * the whole guest list and puts that right:
 *
 *   - the capacity is raised to fit everybody named (never lowered, so an
 *     invitation with an unnamed plus-one keeps its spare seat),
 *   - a row is created for every named person, keeping the answers already
 *     given, and rows for people no longer on the line are removed,
 *   - a household that has already answered has its head counts recomputed
 *     from those individual answers, so the totals cannot disagree with them.
 *
 * A household that has not answered yet is left with its numbers untouched:
 * they are the invitation, not a reply, and recomputing them from nothing but
 * pending answers would read as "nobody is coming".
 *
 * Run `pnpm db:split` to apply, or `pnpm db:split --dry-run` to see first.
 * Running it twice changes nothing.
 */

const dryRun = process.argv.includes("--dry-run") || process.argv.includes("-n");

async function main() {
  const guests = await prisma.guest.findMany({ orderBy: { guestCode: "asc" } });
  let seated = 0;
  let peopled = 0;
  let recounted = 0;

  for (const g of guests) {
    const seats = adultSeats(g);
    const stored = await prisma.attendee.findMany({
      where: { guestCode: g.guestCode },
      orderBy: { position: "asc" },
    });
    const slots = attendeeSlots(g, stored);

    // A seat for everybody named. The capacity only ever goes up: a household
    // invited to bring somebody unnamed keeps room for them.
    if (seats !== g.maxGuests) {
      console.log(`  ${g.guestCode}: ${g.name} — ${g.maxGuests} seat(s) → ${seats}`);
      if (!dryRun) {
        await prisma.guest.update({ where: { id: g.id }, data: { maxGuests: seats } });
      }
      seated++;
    }

    // One row per person, keeping whatever they have already answered. The
    // position is the person's identity, so an answer follows its own name.
    let touched = false;
    for (const slot of slots) {
      const row = stored.find((r) => r.position === slot.position);
      if (row && row.name === slot.name) continue;
      touched = true;
      if (dryRun) continue;
      await prisma.attendee.upsert({
        where: { guestCode_position: { guestCode: g.guestCode, position: slot.position } },
        update: { name: slot.name },
        create: {
          guestCode: g.guestCode,
          position: slot.position,
          name: slot.name,
          church: slot.church,
          reception: slot.reception,
          allergies: slot.allergies,
        },
      });
    }

    // Somebody who is no longer on the line has no answer to give.
    const orphans = stored.filter((r) => r.position >= slots.length);
    if (orphans.length > 0) {
      touched = true;
      if (!dryRun) {
        await prisma.attendee.deleteMany({ where: { id: { in: orphans.map((r) => r.id) } } });
      }
    }

    if (touched) {
      console.log(
        `  ${g.guestCode}: ${g.name} — ${stored.length} row(s) → ${slots.length} ` +
          `(${slots.map((s) => s.name).join(" · ")})`
      );
      peopled++;
    }

    // Only a household that has answered can be counted from its answers.
    const answered =
      g.status !== "PENDING" ||
      slots.some((s) => s.church !== "PENDING" || s.reception !== "PENDING");
    if (!answered) continue;

    const party = partyFromAttendees(slots, { church: g.churchKids, reception: g.kids });
    if (
      party.churchCount !== g.churchCount ||
      party.guestCount !== g.guestCount ||
      party.churchKids !== g.churchKids ||
      party.kids !== g.kids ||
      party.status !== g.status
    ) {
      console.log(
        `  ${g.guestCode}: ${g.name} — church ${g.churchCount}+${g.churchKids} → ` +
          `${party.churchCount}+${party.churchKids}, party ${g.guestCount}+${g.kids} → ` +
          `${party.guestCount}+${party.kids}, ${g.status} → ${party.status}`
      );
      if (!dryRun) {
        await prisma.guest.update({ where: { id: g.id }, data: party });
      }
      recounted++;
    }
  }

  const would = dryRun ? "would be " : "";
  console.log(
    seated + peopled + recounted === 0
      ? `All ${guests.length} invitations already seat everybody they name.`
      : `${guests.length} invitations checked: ${seated} ${would}re-seated, ` +
          `${peopled} ${would}re-peopled, ${recounted} ${would}recounted.`
  );
  if (dryRun) console.log("Dry run — nothing was written.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

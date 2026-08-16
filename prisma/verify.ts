import { PrismaClient } from "@prisma/client";
import { SEED_GUESTS } from "./guests";
import { countGuestNames, splitGuestNames } from "../lib/names";

/**
 * Proves a database is fit to be production.
 *
 * The reset pipeline builds a brand new database and swaps it in front of real
 * guests, so "it ran without erroring" is not good enough: this checks the
 * things that would actually ruin someone's evening — a guest whose personal
 * link no longer resolves, an invitation quietly shrunk to one seat, or a panel
 * with no administrator to log into.
 *
 * Exits non-zero on the first problem, so a pipeline stops before it swaps.
 */
const prisma = new PrismaClient();

type Problem = string;

async function main() {
  const problems: Problem[] = [];

  const guests = await prisma.guest.findMany();
  const byCode = new Map(guests.map((g) => [g.guestCode, g]));

  for (const seed of SEED_GUESTS) {
    const stored = byCode.get(seed.guestCode);
    if (!stored) {
      problems.push(`missing guest: ${seed.guestCode} (${seed.name})`);
      continue;
    }
    if (stored.name !== seed.name) {
      problems.push(`${seed.guestCode}: name is "${stored.name}", expected "${seed.name}"`);
    }
    // "and", "og", "e" and a comma each name another person, and each of them
    // answers for themselves — so the line is the floor for the seat count.
    const seats = Math.max(seed.guestCount, countGuestNames(seed.name));
    if (stored.maxGuests !== seats || stored.maxKids !== seed.kids) {
      problems.push(
        `${seed.guestCode}: invited for ${stored.maxGuests}+${stored.maxKids}, ` +
          `expected ${seats}+${seed.kids}`
      );
    }
  }

  const unexpected = guests.filter(
    (g) => !SEED_GUESTS.some((s) => s.guestCode === g.guestCode)
  );
  for (const g of unexpected) {
    problems.push(`unknown guest in the database: ${g.guestCode} (${g.name})`);
  }

  const admins = await prisma.adminUser.count();
  if (admins === 0) {
    problems.push("no administrator — the panel would be unreachable");
  }

  // Answers are stored per person, keyed by their place on the household line,
  // so a row past the last name belongs to nobody and its answer is lost.
  const attendees = await prisma.attendee.findMany();
  for (const a of attendees) {
    const guest = byCode.get(a.guestCode);
    if (!guest) {
      problems.push(`orphan answer: ${a.guestCode} position ${a.position} (${a.name})`);
      continue;
    }
    const names = splitGuestNames(guest.name);
    if (a.position >= Math.max(names.length, 1)) {
      problems.push(
        `${a.guestCode}: an answer for "${a.name}" sits at position ${a.position}, ` +
          `but "${guest.name}" only names ${names.length} person(s)`
      );
    }
  }

  if (problems.length > 0) {
    console.error(`\nDatabase verification FAILED (${problems.length} problem(s)):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Database verified: all ${SEED_GUESTS.length} guests registered with the ` +
      `right invitation capacity, and ${admins} administrator(s) present.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { SEED_GUESTS } from "./guests";
import { hashPassword } from "../lib/password";
import { clampParty } from "../lib/capacity";

const prisma = new PrismaClient();

/**
 * A database with no administrator is a locked door with no key, so the seed
 * plants the documented first-run account. It carries a temporary password and
 * can do nothing until a strong one replaces it at first login.
 *
 * `RESET_ADMIN=1` goes further and puts the panel back to its documented
 * first-run state: every existing administrator and every live session is
 * removed and a single `admin` / `admin` account is planted. That is the whole
 * point of the reset pipeline — nobody should have to remember which password
 * the last test run happened to set.
 */
async function seedAdmin() {
  const reset = process.env.RESET_ADMIN === "1" || process.env.RESET_ADMIN === "true";

  if (reset) {
    // Sessions are cascaded away with their owner, so no browser survives this.
    const { count } = await prisma.adminUser.deleteMany({});
    await prisma.adminUser.create({
      data: {
        username: "admin",
        passwordHash: await hashPassword("admin"),
        mustChangePassword: true,
        createdByName: "reset",
      },
    });
    console.log(
      `Administrators reset: ${count} removed, admin / admin recreated ` +
        "(must be changed at login)."
    );
    return;
  }

  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    console.log(`${existing} administrator(s) already present — untouched.`);
    return;
  }
  await prisma.adminUser.create({
    data: {
      username: "admin",
      passwordHash: await hashPassword("admin"),
      mustChangePassword: true,
      createdByName: "seed",
    },
  });
  console.log("Created the first administrator: admin / admin (must be changed at login).");
}

/**
 * An answer given before a capacity was tightened must not survive it: nobody
 * should appear in the final head count with more adults, or with children,
 * than their invitation allows.
 */
async function clampToCapacity() {
  const guests = await prisma.guest.findMany();
  let fixed = 0;
  for (const g of guests) {
    const { guestCount, kids } = clampParty(g, g);
    const church = clampParty({ guestCount: g.churchCount, kids: g.churchKids }, g);
    if (
      guestCount !== g.guestCount ||
      kids !== g.kids ||
      church.guestCount !== g.churchCount ||
      church.kids !== g.churchKids
    ) {
      await prisma.guest.update({
        where: { id: g.id },
        data: { guestCount, kids, churchCount: church.guestCount, churchKids: church.kids },
      });
      fixed++;
    }
  }
  if (fixed > 0) console.log(`Trimmed ${fixed} answer(s) back to the invited capacity.`);
}

/**
 * Answers given before the day was split in two said one thing: "we are
 * coming". That meant the whole day, so a household already confirmed keeps its
 * numbers at the church too, rather than silently turning up as nobody.
 */
async function backfillChurch() {
  const guests = await prisma.guest.findMany({
    where: { status: "ATTENDING", churchCount: 0, guestCount: { gt: 0 } },
  });
  for (const g of guests) {
    await prisma.guest.update({
      where: { id: g.id },
      data: { churchCount: g.guestCount, churchKids: g.kids },
    });
  }
  const undecided = await prisma.attendee.findMany({
    where: { church: "PENDING", reception: { not: "PENDING" } },
  });
  for (const a of undecided) {
    await prisma.attendee.update({ where: { id: a.id }, data: { church: a.reception } });
  }
  if (guests.length > 0 || undecided.length > 0) {
    console.log(`Carried ${guests.length} household answer(s) over to the church.`);
  }
}

async function main() {
  console.log(`Seeding ${SEED_GUESTS.length} guests...`);

  const codes = new Set(SEED_GUESTS.map((g) => g.guestCode));
  if (codes.size !== SEED_GUESTS.length) {
    throw new Error("Duplicate guestCode in the seed list");
  }

  for (const g of SEED_GUESTS) {
    await prisma.guest.upsert({
      where: { guestCode: g.guestCode },
      // Re-seeding must never clobber an answer, a score or a sent invitation —
      // only the invitation's capacity, which is ours to decide.
      update: {
        name: g.name,
        group: g.group,
        maxGuests: g.guestCount,
        maxKids: g.kids,
        likely: g.likely,
      },
      create: {
        guestCode: g.guestCode,
        name: g.name,
        group: g.group,
        likely: g.likely,
        maxGuests: g.guestCount,
        maxKids: g.kids,
        churchCount: g.guestCount,
        churchKids: g.kids,
        guestCount: g.guestCount,
        kids: g.kids,
      },
    });
  }

  await backfillChurch();
  await clampToCapacity();

  const total = await prisma.guest.count();
  console.log(`Done. ${total} guests in the database.`);

  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

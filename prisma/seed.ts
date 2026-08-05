import { PrismaClient } from "@prisma/client";
import { SEED_GUESTS } from "./guests";
import { hashPassword } from "../lib/password";
import { clampParty } from "../lib/capacity";

const prisma = new PrismaClient();

/**
 * A database with no administrator is a locked door with no key, so the seed
 * plants the documented first-run account. It carries a temporary password and
 * can do nothing until a strong one replaces it at first login.
 */
async function seedAdmin() {
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
    if (guestCount !== g.guestCount || kids !== g.kids) {
      await prisma.guest.update({ where: { id: g.id }, data: { guestCount, kids } });
      fixed++;
    }
  }
  if (fixed > 0) console.log(`Trimmed ${fixed} answer(s) back to the invited capacity.`);
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
        guestCount: g.guestCount,
        kids: g.kids,
      },
    });
  }

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

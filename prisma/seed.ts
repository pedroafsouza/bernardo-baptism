import { PrismaClient } from "@prisma/client";
import { SEED_GUESTS } from "./guests";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${SEED_GUESTS.length} guests...`);

  const codes = new Set(SEED_GUESTS.map((g) => g.guestCode));
  if (codes.size !== SEED_GUESTS.length) {
    throw new Error("Duplicate guestCode in the seed list");
  }

  for (const g of SEED_GUESTS) {
    await prisma.guest.upsert({
      where: { guestCode: g.guestCode },
      // Re-seeding must never clobber an answer, a score or a sent invitation.
      update: {
        name: g.name,
        group: g.group,
        kids: g.kids,
        likely: g.likely,
      },
      create: g,
    });
  }

  const total = await prisma.guest.count();
  console.log(`Done. ${total} guests in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-shot, idempotent backfill for the invitation capacity columns.
 *
 * `maxGuests` / `maxKids` were added after the guest list already existed, so
 * every stored row starts on the schema defaults (1 adult, no children). Left
 * alone that would silently shrink invitations people have already accepted,
 * so any household whose answer exceeds its capacity has the capacity raised
 * to match what it was actually invited — never the other way round. Running
 * this twice changes nothing.
 */
async function main() {
  const guests = await prisma.guest.findMany();
  let raised = 0;

  for (const g of guests) {
    const maxGuests = Math.max(g.maxGuests, g.guestCount, 1);
    const maxKids = Math.max(g.maxKids, g.kids);
    if (maxGuests !== g.maxGuests || maxKids !== g.maxKids) {
      await prisma.guest.update({ where: { id: g.id }, data: { maxGuests, maxKids } });
      raised++;
    }
  }

  console.log(
    raised > 0
      ? `Backfilled invitation capacity for ${raised} of ${guests.length} guests.`
      : `Invitation capacity already correct for all ${guests.length} guests.`
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

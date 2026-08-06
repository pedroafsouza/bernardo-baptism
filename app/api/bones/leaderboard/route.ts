import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boneDay, isBoneDay } from "@/lib/dailyBones";

export const dynamic = "force-dynamic";

const TOP = 10;

/**
 * The bone competition.
 *
 * Two standings from the same rows: who fed Oscar most today, and who has fed
 * him most since the invitations went out. Names and totals only — an
 * invitation code is never anything but a key here.
 */
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("day");
  const day = isBoneDay(requested) ? requested : boneDay();

  const [todayRows, allTimeRows] = await Promise.all([
    prisma.boneCollection.groupBy({
      by: ["guestCode"],
      where: { day },
      _count: { _all: true },
    }),
    prisma.boneCollection.groupBy({
      by: ["guestCode"],
      _count: { _all: true },
    }),
  ]);

  const codes = [
    ...new Set([...todayRows, ...allTimeRows].map((r) => r.guestCode)),
  ];
  const guests = codes.length
    ? await prisma.guest.findMany({
        where: { guestCode: { in: codes } },
        select: { guestCode: true, name: true },
      })
    : [];
  const names = new Map(guests.map((g) => [g.guestCode, g.name]));

  // A guest deleted since a bone was collected keeps their row out of the
  // standings rather than showing up as an unnamed code.
  const rank = (rows: Array<{ guestCode: string; _count: { _all: number } }>) =>
    rows
      .filter((r) => names.has(r.guestCode))
      .map((r) => ({
        guestCode: r.guestCode,
        name: names.get(r.guestCode)!,
        bones: r._count._all,
      }))
      .sort((a, b) => b.bones - a.bones || a.name.localeCompare(b.name))
      .slice(0, TOP)
      .map((e, i) => ({ rank: i + 1, ...e }));

  return NextResponse.json({
    day,
    today: rank(todayRows),
    allTime: rank(allTimeRows),
  });
}

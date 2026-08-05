import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public top-10 leaderboard — names and scores only, never invitation codes. */
export async function GET() {
  const rows = await prisma.guest.findMany({
    where: { score: { gt: 0 } },
    orderBy: [{ score: "desc" }, { playedAt: "asc" }],
    take: 10,
    select: { name: true, score: true, bones: true, guestCode: true },
  });

  return NextResponse.json({
    entries: rows.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      bones: r.bones,
      guestCode: r.guestCode,
    })),
  });
}

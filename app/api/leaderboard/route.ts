import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeId } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Public top-10 leaderboard — names and scores only, never invitation codes.
 *
 * A code is the key to somebody's invitation: it opens their page and answers
 * on their behalf. Handing the whole top ten's codes to anyone who fetches
 * this JSON would be handing out the keys, so a caller who wants their own row
 * pointed out says who they are with `?code=` and is told only whether each
 * row is theirs.
 */
export async function GET(req: NextRequest) {
  const asking = safeId(req.nextUrl.searchParams.get("code"));

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
      you: asking !== null && r.guestCode === asking,
    })),
  });
}

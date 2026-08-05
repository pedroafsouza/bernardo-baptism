import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/config";

const MAX_BONES = 999;

/**
 * Records a finished run. Only an improvement is stored, so replaying can never
 * lower a guest's place on the leaderboard.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestCode, bones, blessings, finished } = body ?? {};

    if (!guestCode || typeof guestCode !== "string") {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }

    const safeBones = Math.min(Math.max(Math.floor(Number(bones) || 0), 0), MAX_BONES);
    const safeBlessings = Math.min(Math.max(Math.floor(Number(blessings) || 0), 0), 3);
    const score = computeScore(safeBones, safeBlessings, !!finished);

    const existing = await prisma.guest.findUnique({ where: { guestCode } });
    if (!existing) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const isBest = score > existing.score;
    const guest = isBest
      ? await prisma.guest.update({
          where: { guestCode },
          data: {
            bones: safeBones,
            blessings: safeBlessings,
            score,
            playedAt: new Date(),
          },
        })
      : await prisma.guest.update({
          where: { guestCode },
          data: { playedAt: new Date() },
        });

    return NextResponse.json({ ok: true, score, isBest, best: guest.score });
  } catch (err) {
    console.error("Score error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeScore } from "@/lib/config";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeInt } from "@/lib/security";
import { isDemoCode } from "@/lib/demo";

export const dynamic = "force-dynamic";

const MAX_BONES = 999;

/**
 * Records a finished run. Only an improvement is stored, so replaying can never
 * lower a guest's place on the leaderboard. Throttled per address so the
 * endpoint cannot be used to hammer the database.
 */
export async function POST(req: NextRequest) {
  const limit = rateLimit(`score:${clientIp(req)}`, RATE_RULES.publicWrite);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "For mange forespørgsler. Prøv igen om lidt." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const body = await readJson<{
      guestCode?: unknown;
      bones?: unknown;
      blessings?: unknown;
      finished?: unknown;
    }>(req, 2048);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

    const guestCode = safeId(body.data.guestCode);
    if (!guestCode) {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }

    const safeBones = safeInt(body.data.bones, 0, MAX_BONES, 0);
    const safeBlessings = safeInt(body.data.blessings, 0, 3, 0);
    const score = computeScore(safeBones, safeBlessings, !!body.data.finished);

    // Demo runs are scored for the player but never stored, so the demo link
    // can't appear on the leaderboard.
    if (isDemoCode(guestCode)) {
      return NextResponse.json({ ok: true, demo: true, score, isBest: true, best: score });
    }

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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeScore, POINTS_PER_BLESSING, POINTS_PER_BONE } from "@/lib/config";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeInt } from "@/lib/security";
import { isDemoCode } from "@/lib/demo";
import { acceptableBoneDays, boneDay, isBoneDay } from "@/lib/dailyBones";
import { beatsDay, bestRun, totalScore, type DailyRun } from "@/lib/dailyScore";

export const dynamic = "force-dynamic";

const MAX_BONES = 999;

/**
 * Records a finished run.
 *
 * The run is filed against the day it was played (see `lib/dailyScore.ts`), and
 * the guest's leaderboard figure is the sum of every day they have played. So
 * coming back tomorrow always adds to the standings, while replaying today can
 * only ever raise today's own contribution. Throttled per address so the
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
      day?: unknown;
    }>(req, 2048);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

    const guestCode = safeId(body.data.guestCode);
    if (!guestCode) {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }

    const safeBones = safeInt(body.data.bones, 0, MAX_BONES, 0);
    const safeBlessings = safeInt(body.data.blessings, 0, 3, 0);
    const finished = !!body.data.finished;
    const score = computeScore(safeBones, safeBlessings, finished);

    // A run that straddles Danish midnight hands its result in to the day it
    // was actually played, exactly as its bones do. Anything else — a missing,
    // malformed or invented day — is filed under today.
    const claimed = body.data.day;
    const day =
      isBoneDay(claimed) && acceptableBoneDays().includes(claimed) ? claimed : boneDay();

    const run: DailyRun = { bones: safeBones, blessings: safeBlessings, finished, score };

    // Demo runs are scored for the player but never stored, so the demo link
    // can't appear on the leaderboard.
    if (isDemoCode(guestCode)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        score,
        isBest: true,
        best: score,
        total: score,
        days: 1,
        day,
      });
    }

    const existing = await prisma.guest.findUnique({ where: { guestCode } });
    if (!existing) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Households that scored before the standings were day-by-day keep what
      // they had: their old best run becomes the first day's row. Done once,
      // lazily, and only when there is something to preserve.
      const rowCount = await tx.dailyScore.count({ where: { guestCode } });
      if (rowCount === 0 && existing.score > 0) {
        const playedAt = existing.playedAt ?? existing.updatedAt;
        await tx.dailyScore.create({
          data: {
            guestCode,
            day: boneDay(playedAt),
            bones: existing.bones,
            blessings: existing.blessings,
            // The stored total carried the finish bonus, so it is read back out
            // of it rather than guessed at.
            finished:
              existing.score >
              existing.bones * POINTS_PER_BONE + existing.blessings * POINTS_PER_BLESSING,
            score: existing.score,
            playedAt,
          },
        });
      }

      const current = await tx.dailyScore.findUnique({
        where: { guestCode_day: { guestCode, day } },
      });
      const improved = beatsDay(run, current);

      if (improved) {
        await tx.dailyScore.upsert({
          where: { guestCode_day: { guestCode, day } },
          create: { guestCode, day, ...run, playedAt: new Date() },
          update: { ...run, playedAt: new Date() },
        });
      }

      // The total is derived from the rows rather than incremented, so a
      // retried request, two open tabs or a replay can never inflate it.
      const days = await tx.dailyScore.findMany({
        where: { guestCode },
        select: { bones: true, blessings: true, finished: true, score: true },
      });
      const total = totalScore(days);
      const best = bestRun(days);

      const guest = await tx.guest.update({
        where: { guestCode },
        data: {
          bones: best?.bones ?? 0,
          blessings: best?.blessings ?? 0,
          score: total,
          playedAt: new Date(),
        },
      });

      return { improved, total: guest.score, days: days.length };
    });

    return NextResponse.json({
      ok: true,
      score,
      // "A new record" now means this run improved the day it belongs to.
      isBest: result.improved,
      best: result.total,
      total: result.total,
      days: result.days,
      day,
    });
  } catch (err) {
    console.error("Score error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

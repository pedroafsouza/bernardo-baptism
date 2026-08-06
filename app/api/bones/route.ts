import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId } from "@/lib/security";
import { isDemoCode } from "@/lib/demo";
import {
  acceptableBoneDays,
  boneDay,
  dailyBoneCount,
  isBoneDay,
} from "@/lib/dailyBones";

export const dynamic = "force-dynamic";

/**
 * The client batches its pickups every 500 ms, so a single request carries a
 * handful of bones at most. This cap is generous enough for a very good run
 * between two flushes and small enough that the body stays tiny.
 */
const MAX_BATCH = 64;

/**
 * Bones handed in.
 *
 * The game reports *which* bones were collected, not how many, so the server
 * can check every one of them against the layout it generates itself for that
 * day. A bone that does not exist is dropped; a bone already handed in is
 * ignored by the unique key. Replaying a batch therefore changes nothing, which
 * is exactly what a throttled, retried, best-effort client needs.
 */
export async function POST(req: NextRequest) {
  const limit = rateLimit(`bones:${clientIp(req)}`, RATE_RULES.bones);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "For mange forespørgsler. Prøv igen om lidt." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const body = await readJson<{
      guestCode?: unknown;
      day?: unknown;
      bones?: unknown;
    }>(req, 4096);
    if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

    const guestCode = safeId(body.data.guestCode);
    if (!guestCode) {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }

    const day = body.data.day;
    if (!isBoneDay(day)) {
      return NextResponse.json({ error: "day must be YYYY-MM-DD" }, { status: 400 });
    }
    // A run that started just before midnight may hand in yesterday's bones,
    // but nobody gets to mine a day that has not happened.
    if (!acceptableBoneDays().includes(day)) {
      return NextResponse.json({ error: "That day is closed" }, { status: 400 });
    }

    if (!Array.isArray(body.data.bones)) {
      return NextResponse.json({ error: "bones must be an array" }, { status: 400 });
    }

    const total = dailyBoneCount(day);
    const indexes = [
      ...new Set(
        body.data.bones
          .slice(0, MAX_BATCH)
          .map((v) => Math.floor(Number(v)))
          .filter((n) => Number.isInteger(n) && n >= 0 && n < total)
      ),
    ];

    if (indexes.length === 0) {
      return NextResponse.json({ ok: true, added: 0, today: 0, total: 0 });
    }

    // The demo link plays the full mechanic but never enters the competition.
    if (isDemoCode(guestCode)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        added: indexes.length,
        today: indexes.length,
        total: indexes.length,
      });
    }

    const guest = await prisma.guest.findUnique({
      where: { guestCode },
      select: { id: true },
    });
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // SQLite has no "insert or ignore" through Prisma's `createMany`, so the
    // bones already on record are filtered out first and the unique key is left
    // as the backstop for two flushes that overlap.
    const known = new Set(
      (
        await prisma.boneCollection.findMany({
          where: { guestCode, day, boneIndex: { in: indexes } },
          select: { boneIndex: true },
        })
      ).map((row) => row.boneIndex)
    );
    const fresh = indexes.filter((i) => !known.has(i));

    let added = 0;
    if (fresh.length > 0) {
      try {
        const result = await prisma.boneCollection.createMany({
          data: fresh.map((boneIndex) => ({ guestCode, day, boneIndex })),
        });
        added = result.count;
      } catch {
        // Something in the batch collided — put them in one at a time so the
        // rest of the guest's bones are not lost with it.
        for (const boneIndex of fresh) {
          try {
            await prisma.boneCollection.create({ data: { guestCode, day, boneIndex } });
            added++;
          } catch {
            /* already handed in */
          }
        }
      }
    }

    // `bonesTotal` is a cached count, so it is derived from the rows rather
    // than incremented blindly: a re-sent batch can never inflate it.
    const [todayCount, allTime] = await Promise.all([
      prisma.boneCollection.count({ where: { guestCode, day } }),
      prisma.boneCollection.count({ where: { guestCode } }),
    ]);

    if (added > 0) {
      await prisma.guest.update({
        where: { guestCode },
        data: { bonesTotal: allTime, playedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, added, today: todayCount, total: allTime });
  } catch (err) {
    console.error("Bones error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * The bones laid out for a given day — the same list the game builds locally —
 * and, if a guest is named, the ones they have already handed in.
 *
 * Reloading the page is not a way to collect a bone twice, so the game asks for
 * this before it builds the level and simply leaves those bones out. The
 * standings would ignore the duplicates anyway; this stops them being picked up
 * in the first place, which is what a returning guest actually expects to see.
 */
export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day");
  const resolved = isBoneDay(day) && acceptableBoneDays().includes(day) ? day : boneDay();
  const count = dailyBoneCount(resolved);

  const guestCode = safeId(req.nextUrl.searchParams.get("code"));
  if (!guestCode || isDemoCode(guestCode)) {
    return NextResponse.json({ day: resolved, count, collected: [] });
  }

  try {
    const rows = await prisma.boneCollection.findMany({
      where: { guestCode, day: resolved },
      select: { boneIndex: true },
    });
    return NextResponse.json({
      day: resolved,
      count,
      collected: rows.map((r) => r.boneIndex).filter((i) => i >= 0 && i < count),
    });
  } catch {
    // Never let a lookup failure keep a guest out of the game — worst case they
    // pick a bone up again and the unique key drops it.
    return NextResponse.json({ day: resolved, count, collected: [] });
  }
}

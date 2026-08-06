import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireAdmin } from "@/lib/adminAuth";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeString } from "@/lib/security";
import { SEED_GUESTS } from "@/prisma/guests";

export const dynamic = "force-dynamic";

const RESET_MODES = ["scores", "answers", "full"] as const;
type ResetMode = (typeof RESET_MODES)[number];

/**
 * Destructive maintenance endpoint.
 *
 * Three deliberately separate blast radii, because "reset" means very different
 * things before and after the invitations go out:
 *
 *   scores  — wipe the leaderboard only. RSVPs are untouched.
 *   answers — put every guest back to PENDING and clear their game progress.
 *             The guest list and the invitation-sent flags survive.
 *   full    — delete every guest and re-plant the canonical list from
 *             prisma/guests.ts. Everything else is lost.
 *
 * All three require the literal confirmation string "RESET", are throttled hard,
 * and are written to the audit trail with the name of whoever pulled the lever.
 */
export async function POST(req: NextRequest) {
  const limit = rateLimit(`reset:${clientIp(req)}`, RATE_RULES.destructive);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "For mange forespørgsler" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const body = await readJson<{ mode?: unknown; confirm?: unknown }>(req, 2048);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  if (safeString(body.data.confirm, { max: 20 }) !== "RESET") {
    return NextResponse.json({ error: "Skriv RESET for at bekræfte" }, { status: 400 });
  }

  const mode = RESET_MODES.find((m) => m === body.data.mode);
  if (!mode) {
    return NextResponse.json(
      { error: `mode skal være en af: ${RESET_MODES.join(", ")}` },
      { status: 400 }
    );
  }

  const before = await prisma.guest.count();
  const actor = session.admin;

  async function record(affected: number, detail: string) {
    await audit({
      action: "DATABASE_RESET",
      actorName: actor.username,
      actorId: actor.id,
      targetType: "database",
      targetId: mode,
      detail,
      req,
    });
    return affected;
  }

  if (mode === "scores") {
    const { count } = await prisma.guest.updateMany({
      data: { bones: 0, blessings: 0, score: 0, bonesTotal: 0, playedAt: null },
    });
    // The leaderboard and the bone race are one and the same result, so they
    // are cleared together — a standing with no rows behind it is a lie.
    await prisma.boneCollection.deleteMany({});
    await record(count, `Leaderboard and bone race cleared for ${count} guests`);
    return NextResponse.json({
      ok: true,
      mode,
      affected: count,
      message: `Topliste nulstillet for ${count} gæster.`,
    });
  }

  if (mode === "answers") {
    const { count } = await prisma.guest.updateMany({
      data: {
        status: "PENDING",
        bones: 0,
        blessings: 0,
        score: 0,
        bonesTotal: 0,
        playedAt: null,
      },
    });
    await prisma.boneCollection.deleteMany({});
    await record(count, `${count} guests reset to PENDING`);
    return NextResponse.json({
      ok: true,
      mode,
      affected: count,
      message: `${count} gæster sat tilbage til "afventer svar".`,
    });
  }

  // full — rebuild the guest list from scratch.
  await prisma.boneCollection.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.guest.createMany({
    // `guestCount`/`kids` in the seed list are the invitation's *capacity*, so
    // they have to land in both pairs of columns. Copying only the confirmed
    // pair used to rebuild every household as "invited for one adult".
    data: SEED_GUESTS.map((g) => ({
      guestCode: g.guestCode,
      name: g.name,
      group: g.group,
      likely: g.likely,
      maxGuests: g.guestCount,
      maxKids: g.kids,
      guestCount: g.guestCount,
      kids: g.kids,
    })),
  });
  const after = await prisma.guest.count();
  await record(after, `Full reset: ${before} guests deleted, ${after} recreated`);

  return NextResponse.json({
    ok: true,
    mode,
    affected: after,
    message: `Databasen er nulstillet. ${before} gæster slettet, ${after} genskabt uden svar.`,
  });
}

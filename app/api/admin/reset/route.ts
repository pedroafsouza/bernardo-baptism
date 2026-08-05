import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_SECRET } from "@/lib/config";
import { SEED_GUESTS } from "@/prisma/guests";

function isAuthorized(req: NextRequest): boolean {
  if (!ADMIN_SECRET) return false;
  const header = req.headers.get("x-admin-secret");
  const cookie = req.cookies.get("admin_secret")?.value;
  return header === ADMIN_SECRET || cookie === ADMIN_SECRET;
}

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
 * All three require the literal confirmation string "RESET", so a stray click
 * or a replayed request cannot trigger one.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode, confirm } = (await req.json().catch(() => ({}))) as {
    mode?: string;
    confirm?: string;
  };

  if (confirm !== "RESET") {
    return NextResponse.json({ error: "Skriv RESET for at bekræfte" }, { status: 400 });
  }

  if (!RESET_MODES.includes(mode as ResetMode)) {
    return NextResponse.json(
      { error: `mode skal være en af: ${RESET_MODES.join(", ")}` },
      { status: 400 }
    );
  }

  const before = await prisma.guest.count();

  if (mode === "scores") {
    const { count } = await prisma.guest.updateMany({
      data: { bones: 0, blessings: 0, score: 0, playedAt: null },
    });
    return NextResponse.json({
      ok: true,
      mode,
      affected: count,
      message: `Topliste nulstillet for ${count} gæster.`,
    });
  }

  if (mode === "answers") {
    const { count } = await prisma.guest.updateMany({
      data: { status: "PENDING", bones: 0, blessings: 0, score: 0, playedAt: null },
    });
    return NextResponse.json({
      ok: true,
      mode,
      affected: count,
      message: `${count} gæster sat tilbage til "afventer svar".`,
    });
  }

  // full — rebuild the guest list from scratch.
  await prisma.guest.deleteMany({});
  await prisma.guest.createMany({ data: SEED_GUESTS });
  const after = await prisma.guest.count();

  return NextResponse.json({
    ok: true,
    mode,
    affected: after,
    message: `Databasen er nulstillet. ${before} gæster slettet, ${after} genskabt uden svar.`,
  });
}

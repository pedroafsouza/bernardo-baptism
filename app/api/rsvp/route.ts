import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeInt } from "@/lib/security";
import { clampParty } from "@/lib/capacity";
import { demoGuest, isDemoCode } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Guest-facing writes are throttled per address — nobody needs 30 RSVPs a minute. */
function throttle(req: NextRequest, bucket: string) {
  const limit = rateLimit(`${bucket}:${clientIp(req)}`, RATE_RULES.publicWrite);
  if (limit.ok) return null;
  return NextResponse.json(
    { error: "For mange forespørgsler. Prøv igen om lidt." },
    { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
  );
}

export async function POST(req: NextRequest) {
  const throttled = throttle(req, "rsvp");
  if (throttled) return throttled;

  try {
    const body = await readJson<{
      guestCode?: unknown;
      status?: unknown;
      guestCount?: unknown;
      kids?: unknown;
    }>(req, 2048);
    if (!body.ok) {
      if (body.reason === "MALICIOUS") {
        await audit({
          action: "REQUEST_BLOCKED",
          success: false,
          detail: "Rejected RSVP payload (injection screen)",
          req,
        });
      }
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const guestCode = safeId(body.data.guestCode);
    if (!guestCode) {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }

    const status = body.data.status;
    if (status !== "ATTENDING" && status !== "DECLINED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // The demo invitation goes through the whole flow but is never stored.
    if (isDemoCode(guestCode)) {
      const attending = status === "ATTENDING";
      return NextResponse.json({
        ok: true,
        demo: true,
        guest: demoGuest({
          status,
          guestCount: attending ? safeInt(body.data.guestCount, 1, 10, 1) : 0,
          kids: attending ? safeInt(body.data.kids, 0, 10, 0) : 0,
        }),
      });
    }

    const existing = await prisma.guest.findUnique({ where: { guestCode } });
    if (!existing) {
      return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
    }

    // The invitation's capacity is the ceiling, and it is enforced here rather
    // than only in the form: a household invited without children cannot end up
    // in the final head count with children, whatever is posted.
    const { guestCount: safeCount, kids: safeKids } = clampParty(
      {
        guestCount: safeInt(body.data.guestCount, 1, 10, 1),
        kids: safeInt(body.data.kids, 0, 10, 0),
      },
      existing,
      { attending: status === "ATTENDING" }
    );

    const guest = await prisma.guest.update({
      where: { guestCode },
      data: { status, guestCount: safeCount, kids: safeKids },
    });

    await audit({
      action: "RSVP_SUBMITTED",
      actorName: guest.name,
      targetType: "guest",
      targetId: guest.guestCode,
      detail: `${status} · ${safeCount} adults · ${safeKids} kids`,
      req,
    });

    return NextResponse.json({ ok: true, guest });
  } catch (err) {
    console.error("RSVP error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const throttled = throttle(req, "rsvp-read");
  if (throttled) return throttled;

  const guestCode = safeId(req.nextUrl.searchParams.get("code"));
  if (!guestCode) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (isDemoCode(guestCode)) {
    return NextResponse.json({ guest: demoGuest(), demo: true });
  }
  const guest = await prisma.guest.findUnique({ where: { guestCode } });
  if (!guest) {
    return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
  }
  return NextResponse.json({ guest });
}

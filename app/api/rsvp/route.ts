import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeInt, safeString } from "@/lib/security";
import { clampParty } from "@/lib/capacity";
import {
  attendeeSlots,
  partyFromAttendees,
  summarizeAttendees,
  MAX_ALLERGY_LENGTH,
  type AttendeeSlot,
} from "@/lib/attendees";
import { loadAttendeeSlots, saveAttendeeSlots } from "@/lib/attendeeStore";
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

/**
 * Allergies are free text a guest types under pressure, so they are trimmed to
 * what we are willing to store rather than rejected for being long. Anything
 * that still looks like an attack has already been refused by `readJson`.
 */
function safeAllergies(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, MAX_ALLERGY_LENGTH);
  return safeString(trimmed, { max: MAX_ALLERGY_LENGTH }) ?? "";
}

type PostedAttendee = { position?: unknown; attending?: unknown; allergies?: unknown };

/**
 * Lays the posted answers onto the invitation's real people. Positions we do
 * not know are ignored, so the payload can never add a guest.
 */
function applyAnswers(slots: AttendeeSlot[], posted: PostedAttendee[]): AttendeeSlot[] {
  const byPosition = new Map<number, PostedAttendee>();
  for (const row of posted) {
    const position = safeInt(row?.position, 0, 99, -1);
    if (position >= 0) byPosition.set(position, row);
  }

  return slots.map((slot) => {
    const answer = byPosition.get(slot.position);
    if (!answer) return slot;
    return {
      ...slot,
      status: answer.attending ? ("ATTENDING" as const) : ("DECLINED" as const),
      allergies: answer.attending ? safeAllergies(answer.allergies) : "",
    };
  });
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
      kidsAllergies?: unknown;
      attendees?: unknown;
    }>(req, 4096);
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

    // Two shapes are accepted: the per-person reply the RSVP form now sends,
    // and the older household-level one, which is still the only thing a plain
    // "everybody is coming" caller needs.
    const posted = Array.isArray(body.data.attendees)
      ? (body.data.attendees as PostedAttendee[]).slice(0, 20)
      : null;
    const status = body.data.status;
    if (!posted && status !== "ATTENDING" && status !== "DECLINED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const kidsAllergies = safeAllergies(body.data.kidsAllergies);

    // The demo invitation goes through the whole flow but is never stored.
    if (isDemoCode(guestCode)) {
      const guest = demoGuest();
      const slots = posted
        ? applyAnswers(attendeeSlots(guest), posted)
        : attendeeSlots(guest).map((s) => ({
            ...s,
            status: status === "ATTENDING" ? ("ATTENDING" as const) : ("DECLINED" as const),
          }));
      const answered = partyFromAttendees(slots, safeInt(body.data.kids, 0, 10, 0));
      const party = clampParty(answered, guest, {
        attending: answered.status === "ATTENDING",
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        guest: demoGuest({
          ...party,
          status: answered.status,
          kidsAllergies: party.kids > 0 ? kidsAllergies : "",
        }),
        attendees: slots,
      });
    }

    const existing = await prisma.guest.findUnique({ where: { guestCode } });
    if (!existing) {
      return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
    }

    let slots: AttendeeSlot[];
    if (posted) {
      slots = applyAnswers(await loadAttendeeSlots(existing), posted);
    } else {
      // A household-level answer applies to everyone on the invitation, and an
      // adult who is not coming is not carrying an allergy note either.
      const all = status === "ATTENDING" ? ("ATTENDING" as const) : ("DECLINED" as const);
      const wanted = safeInt(body.data.guestCount, 0, 10, 1);
      slots = (await loadAttendeeSlots(existing)).map((slot, i) => ({
        ...slot,
        status: all === "ATTENDING" && i >= wanted ? ("DECLINED" as const) : all,
        allergies: all === "ATTENDING" && i < wanted ? slot.allergies : "",
      }));
    }

    const answered = partyFromAttendees(slots, safeInt(body.data.kids, 0, 10, 0));
    // The invitation's capacity is the ceiling, and it is enforced here rather
    // than only in the form: a household invited without children cannot end up
    // in the final head count with children, whatever is posted.
    const { guestCount: safeCount, kids: safeKids } = clampParty(answered, existing, {
      attending: answered.status === "ATTENDING",
    });

    const guest = await prisma.guest.update({
      where: { guestCode },
      data: {
        status: answered.status,
        guestCount: safeCount,
        kids: safeKids,
        kidsAllergies: safeKids > 0 ? kidsAllergies : "",
      },
    });
    await saveAttendeeSlots(guestCode, slots);

    await audit({
      action: "RSVP_SUBMITTED",
      actorName: guest.name,
      targetType: "guest",
      targetId: guest.guestCode,
      detail: `${answered.status} · ${safeCount} adults · ${safeKids} kids · ${summarizeAttendees(slots)}`,
      req,
    });

    return NextResponse.json({ ok: true, guest, attendees: slots });
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
    const guest = demoGuest();
    return NextResponse.json({ guest, attendees: attendeeSlots(guest), demo: true });
  }
  const guest = await prisma.guest.findUnique({ where: { guestCode } });
  if (!guest) {
    return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
  }
  return NextResponse.json({ guest, attendees: await loadAttendeeSlots(guest) });
}

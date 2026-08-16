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
  type Party,
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

type PostedAttendee = {
  position?: unknown;
  church?: unknown;
  reception?: unknown;
  allergies?: unknown;
};

function answer(value: unknown) {
  return value ? ("ATTENDING" as const) : ("DECLINED" as const);
}

/**
 * Lays the posted answers onto the invitation's real people. Positions we do
 * not know are ignored, so the payload can never add a guest. Allergies belong
 * to the meal, so they are only kept for someone staying for the party.
 */
function applyAnswers(slots: AttendeeSlot[], posted: PostedAttendee[]): AttendeeSlot[] {
  const byPosition = new Map<number, PostedAttendee>();
  for (const row of posted) {
    const position = safeInt(row?.position, 0, 99, -1);
    if (position >= 0) byPosition.set(position, row);
  }

  return slots.map((slot) => {
    const posted = byPosition.get(slot.position);
    if (!posted) return slot;
    return {
      ...slot,
      church: answer(posted.church),
      reception: answer(posted.reception),
      allergies: posted.reception ? safeAllergies(posted.allergies) : "",
    };
  });
}

/**
 * Trims an answer to what the invitation seats — each half of the day on its
 * own, since an invitation for two is an invitation for two at both.
 */
function fits(answered: Party, capacity: { maxGuests?: number; maxKids?: number }): Party {
  const church = clampParty(
    { guestCount: answered.churchCount, kids: answered.churchKids },
    capacity,
    { attending: answered.churchCount > 0 }
  );
  const reception = clampParty(answered, capacity, { attending: answered.guestCount > 0 });
  return {
    churchCount: church.guestCount,
    churchKids: church.kids,
    guestCount: reception.guestCount,
    kids: reception.kids,
    status: answered.status,
  };
}

export async function POST(req: NextRequest) {
  const throttled = throttle(req, "rsvp");
  if (throttled) return throttled;

  try {
    const body = await readJson<{
      guestCode?: unknown;
      status?: unknown;
      guestCount?: unknown;
      churchKids?: unknown;
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
    // Children are counted for each half of the day: some families come to the
    // church with everyone and leave the little ones at home for the evening.
    const postedKids = {
      church: safeInt(body.data.churchKids, 0, 10, 0),
      reception: safeInt(body.data.kids, 0, 10, 0),
    };

    // The demo invitation goes through the whole flow but is never stored.
    if (isDemoCode(guestCode)) {
      const guest = demoGuest();
      const slots = posted
        ? applyAnswers(attendeeSlots(guest), posted)
        : attendeeSlots(guest).map((s) => ({
            ...s,
            church: answer(status === "ATTENDING"),
            reception: answer(status === "ATTENDING"),
          }));
      const answered = partyFromAttendees(slots, postedKids);
      const party = fits(answered, guest);
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
      const all = answer(status === "ATTENDING");
      const wanted = safeInt(body.data.guestCount, 0, 10, 1);
      slots = (await loadAttendeeSlots(existing)).map((slot, i) => {
        const coming = all === "ATTENDING" && i < wanted ? ("ATTENDING" as const) : ("DECLINED" as const);
        return { ...slot, church: coming, reception: coming, allergies: coming === "ATTENDING" ? slot.allergies : "" };
      });
    }

    const answered = partyFromAttendees(slots, postedKids);
    // The invitation's capacity is the ceiling, and it is enforced here rather
    // than only in the form: a household invited without children cannot end up
    // in the final head count with children, whatever is posted.
    const party = fits(answered, existing);

    const guest = await prisma.guest.update({
      where: { guestCode },
      data: {
        status: answered.status,
        churchCount: party.churchCount,
        churchKids: party.churchKids,
        guestCount: party.guestCount,
        kids: party.kids,
        kidsAllergies: party.kids > 0 ? kidsAllergies : "",
      },
    });
    await saveAttendeeSlots(guestCode, slots);

    await audit({
      action: "RSVP_SUBMITTED",
      actorName: guest.name,
      targetType: "guest",
      targetId: guest.guestCode,
      detail: `${answered.status} · church ${party.churchCount}+${party.churchKids} · party ${party.guestCount}+${party.kids} · ${summarizeAttendees(slots)}`,
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

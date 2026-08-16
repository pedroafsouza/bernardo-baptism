import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireAdmin } from "@/lib/adminAuth";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeInt, safeString } from "@/lib/security";
import { clampParty } from "@/lib/capacity";
import {
  attendeeSlots,
  partyFromAttendees,
  summarizeAttendees,
  type AttendeeSlot,
} from "@/lib/attendees";
import { loadAttendeeSlots, saveAttendeeSlots } from "@/lib/attendeeStore";
import {
  applyAnswers,
  fitsInvitation,
  safeAllergies,
  type PostedAttendee,
} from "@/lib/rsvpAnswers";

export const dynamic = "force-dynamic";

const GROUPS = ["Family", "Friends", "Godparents", "Colleagues", "Other"];
const STATUSES = ["PENDING", "ATTENDING", "DECLINED"];

/**
 * Keeps the original "sent" timestamp when an invitation is edited after the
 * fact, stamps it the first time it goes out, and clears it when un-marked.
 */
function stampSentAt(sent: boolean, previous: Date | null | undefined): Date | null {
  if (!sent) return null;
  return previous ?? new Date();
}

/**
 * Resolves the head counts for a household.
 *
 * The numbers belong to the guests, not to the invitation: they are either
 * posted outright (an answer given on their behalf), carried over from what the
 * household already said, or — when an administrator moves the household status
 * itself — spread from that verdict. Leaving them out of a payload therefore
 * edits the invitation without touching anybody's answer.
 */
function resolveCounts(
  raw: Record<string, unknown>,
  capacity: { maxGuests: number; maxKids: number },
  status: string,
  existing: {
    status: string;
    guestCount: number;
    kids: number;
    churchCount: number;
    churchKids: number;
  } | null
) {
  // A household marked as coming fills its invitation; one set back to pending
  // or turned down brings nobody until it answers for itself.
  const verdict =
    status === "ATTENDING"
      ? { adults: capacity.maxGuests, kids: capacity.maxKids }
      : { adults: 0, kids: 0 };

  const stored =
    existing && existing.status === status
      ? {
          guestCount: existing.guestCount,
          kids: existing.kids,
          churchCount: existing.churchCount,
          churchKids: existing.churchKids,
        }
      : {
          guestCount: verdict.adults,
          kids: verdict.kids,
          churchCount: verdict.adults,
          churchKids: verdict.kids,
        };

  const pick = (key: string, fallback: number) =>
    raw[key] === undefined ? fallback : safeInt(raw[key], 0, 10, fallback);

  const party = clampParty(
    {
      guestCount: pick("guestCount", stored.guestCount),
      kids: pick("kids", stored.kids),
    },
    capacity
  );
  // The church is counted on its own — some come to the christening only, and
  // some only to the party.
  const church = clampParty(
    {
      guestCount: pick("churchCount", stored.churchCount),
      kids: pick("churchKids", stored.churchKids),
    },
    capacity
  );

  return {
    guestCount: party.guestCount,
    kids: party.kids,
    churchCount: church.guestCount,
    churchKids: church.kids,
  };
}

function throttle(req: NextRequest) {
  const limit = rateLimit(`admin:${clientIp(req)}`, RATE_RULES.admin);
  if (limit.ok) return null;
  return NextResponse.json(
    { error: "For mange forespørgsler" },
    { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
  );
}

/**
 * Keeps the individual answers in step with an edited invitation.
 *
 * Renaming a household or trimming its seats reshapes who is on it, so the rows
 * follow the names. The individual answers are only overwritten when the admin
 * actually moved the household answer itself — otherwise editing an unrelated
 * field would quietly decide for people who had already replied.
 */
type Household = {
  guestCode: string;
  name: string;
  maxGuests: number;
  status: string;
  churchCount: number;
  guestCount: number;
};

async function syncAttendees(
  guest: Household,
  previous: { status: string; churchCount: number; guestCount: number } | null
): Promise<void> {
  const slots = await loadAttendeeSlots(guest);
  const movedChurch = !previous || previous.churchCount !== guest.churchCount;
  const movedReception = !previous || previous.guestCount !== guest.guestCount;
  const movedStatus = !previous || previous.status !== guest.status;

  // A household set back to pending, or turned down wholesale, applies to both
  // halves of the day; a changed head count only reshapes its own half.
  const spread = (
    slot: AttendeeSlot,
    i: number,
    part: "church" | "reception",
    count: number,
    moved: boolean
  ) => {
    if (guest.status === "PENDING") return movedStatus ? "PENDING" : slot[part];
    if (guest.status === "DECLINED") return movedStatus ? "DECLINED" : slot[part];
    if (!moved && !movedStatus) return slot[part];
    return i < count ? "ATTENDING" : "DECLINED";
  };

  const next: AttendeeSlot[] = slots.map((slot, i) => {
    const church = spread(slot, i, "church", guest.churchCount, movedChurch) as AttendeeSlot["church"];
    const reception = spread(
      slot,
      i,
      "reception",
      guest.guestCount,
      movedReception
    ) as AttendeeSlot["reception"];
    return {
      ...slot,
      church,
      reception,
      allergies: reception === "ATTENDING" ? slot.allergies : "",
    };
  });

  await saveAttendeeSlots(guest.guestCode, next);
}

export async function GET(req: NextRequest) {
  const throttled = throttle(req);
  if (throttled) return throttled;

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const guests = await prisma.guest.findMany({
    orderBy: { createdAt: "asc" },
    include: { attendees: { orderBy: { position: "asc" } } },
  });

  // The panel is about who is coming, so every household arrives with its
  // people already resolved — names from the invitation line, answers from the
  // rows they have given.
  return NextResponse.json({
    guests: guests.map(({ attendees, ...guest }) => ({
      ...guest,
      attendees: attendeeSlots(guest, attendees),
    })),
  });
}

export async function POST(req: NextRequest) {
  const throttled = throttle(req);
  if (throttled) return throttled;

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  try {
    const body = await readJson(req);
    if (!body.ok) {
      if (body.reason === "MALICIOUS") {
        await audit({
          action: "REQUEST_BLOCKED",
          actorName: session.admin.username,
          actorId: session.admin.id,
          success: false,
          detail: "Rejected guest payload (injection screen)",
          req,
        });
      }
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const raw = body.data as Record<string, unknown>;
    const id = raw.id === undefined || raw.id === "" ? null : safeId(raw.id);
    const guestCode = safeId(raw.guestCode, 64);
    const name = safeString(raw.name, { min: 1, max: 120 });
    const group = safeString(raw.group, { min: 1, max: 40 });

    if (raw.id && !id) {
      return NextResponse.json({ error: "Ugyldigt id" }, { status: 400 });
    }
    if (!guestCode || !name || !group) {
      return NextResponse.json(
        { error: "guestCode, name and group are required and must be valid" },
        { status: 400 }
      );
    }
    if (!GROUPS.includes(group)) {
      return NextResponse.json({ error: "Ukendt gruppe" }, { status: 400 });
    }

    const status = STATUSES.includes(String(raw.status)) ? String(raw.status) : "PENDING";

    // Capacity first, then the confirmed numbers clamped to it: the admin form
    // and the RSVP form both work this way, and the API is the last place that
    // could let a child into a household invited without any.
    const maxGuests = safeInt(raw.maxGuests, 1, 10, 1);
    const maxKids = safeInt(raw.maxKids, 0, 10, 0);

    // The household has to be read before it is written: the head counts are
    // the guests' own answer, so a payload that leaves them out must carry the
    // stored ones forward rather than reset them.
    const existing = id
      ? await prisma.guest.findUnique({ where: { id } })
      : await prisma.guest.findUnique({ where: { guestCode } });

    if (id && !existing) {
      return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
    }

    const data = {
      guestCode,
      name,
      group,
      status,
      maxGuests,
      maxKids,
      ...resolveCounts(raw, { maxGuests, maxKids }, status, existing),
      likely: raw.likely === undefined ? true : Boolean(raw.likely),
      inviteSent: Boolean(raw.inviteSent),
    };

    let guest;
    const created = !existing;
    const previous = existing;
    if (id) {
      guest = await prisma.guest.update({
        where: { id },
        data: { ...data, inviteSentAt: stampSentAt(data.inviteSent, existing!.inviteSentAt) },
      });
    } else {
      guest = await prisma.guest.upsert({
        where: { guestCode },
        update: data,
        create: { ...data, inviteSentAt: data.inviteSent ? new Date() : null },
      });
    }
    await syncAttendees(guest, previous);

    await audit({
      action: created ? "GUEST_CREATED" : "GUEST_UPDATED",
      actorName: session.admin.username,
      actorId: session.admin.id,
      targetType: "guest",
      targetId: guest.guestCode,
      detail: `${guest.name} · ${guest.group} · ${guest.status}`,
      req,
    });

    return NextResponse.json({ ok: true, guest });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "guestCode already exists" }, { status: 409 });
    }
    console.error("Admin guest save error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * The small edits made straight from the guest list: ticking an invitation as
 * sent, and answering for a household that replied by phone or in person.
 *
 * An answer given here goes through exactly the same door as the guest's own
 * reply — the same people, the same two halves of the day, the same ceiling —
 * so the two can never drift apart.
 */
export async function PATCH(req: NextRequest) {
  const throttled = throttle(req);
  if (throttled) return throttled;

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const body = await readJson<{
    id?: unknown;
    inviteSent?: unknown;
    attendees?: unknown;
    churchKids?: unknown;
    kids?: unknown;
    kidsAllergies?: unknown;
  }>(req, 4096);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const id = safeId(body.data.id);
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.guest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (Array.isArray(body.data.attendees)) {
    const slots = applyAnswers(
      await loadAttendeeSlots(existing),
      (body.data.attendees as PostedAttendee[]).slice(0, 20)
    );
    const answered = partyFromAttendees(slots, {
      church: safeInt(body.data.churchKids, 0, 10, existing.churchKids),
      reception: safeInt(body.data.kids, 0, 10, existing.kids),
    });
    const party = fitsInvitation(answered, existing);
    const kidsAllergies = safeAllergies(body.data.kidsAllergies);

    const guest = await prisma.guest.update({
      where: { id },
      data: {
        status: answered.status,
        churchCount: party.churchCount,
        churchKids: party.churchKids,
        guestCount: party.guestCount,
        kids: party.kids,
        kidsAllergies: party.kids > 0 ? kidsAllergies : "",
      },
    });
    await saveAttendeeSlots(guest.guestCode, slots);

    await audit({
      action: "RSVP_EDITED",
      actorName: session.admin.username,
      actorId: session.admin.id,
      targetType: "guest",
      targetId: guest.guestCode,
      detail: `${guest.name} · ${summarizeAttendees(slots)}`,
      req,
    });

    return NextResponse.json({
      ok: true,
      guest,
      attendees: slots,
    });
  }

  const sent = Boolean(body.data.inviteSent);
  const guest = await prisma.guest.update({
    where: { id },
    data: { inviteSent: sent, inviteSentAt: stampSentAt(sent, existing.inviteSentAt) },
  });

  await audit({
    action: sent ? "INVITE_MARKED_SENT" : "INVITE_MARKED_UNSENT",
    actorName: session.admin.username,
    actorId: session.admin.id,
    targetType: "guest",
    targetId: guest.guestCode,
    detail: guest.name,
    req,
  });

  return NextResponse.json({ ok: true, guest });
}

export async function DELETE(req: NextRequest) {
  const throttled = throttle(req);
  if (throttled) return throttled;

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const id = safeId(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.guest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.guest.delete({ where: { id } });

  await audit({
    action: "GUEST_DELETED",
    actorName: session.admin.username,
    actorId: session.admin.id,
    targetType: "guest",
    targetId: existing.guestCode,
    detail: existing.name,
    req,
  });

  return NextResponse.json({ ok: true });
}

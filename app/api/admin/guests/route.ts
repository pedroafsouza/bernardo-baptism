import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireAdmin } from "@/lib/adminAuth";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeInt, safeString } from "@/lib/security";

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

function throttle(req: NextRequest) {
  const limit = rateLimit(`admin:${clientIp(req)}`, RATE_RULES.admin);
  if (limit.ok) return null;
  return NextResponse.json(
    { error: "For mange forespørgsler" },
    { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
  );
}

export async function GET(req: NextRequest) {
  const throttled = throttle(req);
  if (throttled) return throttled;

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const guests = await prisma.guest.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ guests });
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

    const data = {
      guestCode,
      name,
      group,
      status,
      guestCount: safeInt(raw.guestCount, 0, 10, 1),
      kids: safeInt(raw.kids, 0, 10, 0),
      likely: raw.likely === undefined ? true : Boolean(raw.likely),
      inviteSent: Boolean(raw.inviteSent),
    };

    let guest;
    let created = false;
    if (id) {
      const existing = await prisma.guest.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
      }
      guest = await prisma.guest.update({
        where: { id },
        data: { ...data, inviteSentAt: stampSentAt(data.inviteSent, existing.inviteSentAt) },
      });
    } else {
      const existing = await prisma.guest.findUnique({ where: { guestCode } });
      created = !existing;
      guest = await prisma.guest.upsert({
        where: { guestCode },
        update: data,
        create: { ...data, inviteSentAt: data.inviteSent ? new Date() : null },
      });
    }

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

/** Lightweight toggle used by the "invitation sent" checkbox in the admin table. */
export async function PATCH(req: NextRequest) {
  const throttled = throttle(req);
  if (throttled) return throttled;

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const body = await readJson<{ id?: unknown; inviteSent?: unknown }>(req, 2048);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const id = safeId(body.data.id);
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.guest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_SECRET } from "@/lib/config";

function isAuthorized(req: NextRequest): boolean {
  // An unset ADMIN_SECRET must never authorise anyone, otherwise a missing env
  // var would turn into an open admin API.
  if (!ADMIN_SECRET) return false;
  const header = req.headers.get("x-admin-secret");
  const cookie = req.cookies.get("admin_secret")?.value;
  return header === ADMIN_SECRET || cookie === ADMIN_SECRET;
}

/**
 * Keeps the original "sent" timestamp when an invitation is edited after the
 * fact, stamps it the first time it goes out, and clears it when un-marked.
 */
function stampSentAt(sent: boolean, previous: Date | null | undefined): Date | null {
  if (!sent) return null;
  return previous ?? new Date();
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const guests = await prisma.guest.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ guests });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, guestCode, name, group, status, guestCount, kids, likely, inviteSent } =
      body ?? {};

    if (!guestCode || !name || !group) {
      return NextResponse.json(
        { error: "guestCode, name and group are required" },
        { status: 400 }
      );
    }

    const data = {
      guestCode: String(guestCode).trim(),
      name: String(name).trim(),
      group: String(group).trim(),
      status: ["PENDING", "ATTENDING", "DECLINED"].includes(status) ? status : "PENDING",
      guestCount: Math.max(0, Math.min(Number(guestCount) || 1, 10)),
      kids: Math.max(0, Math.min(Number(kids) || 0, 10)),
      likely: likely === undefined ? true : Boolean(likely),
      inviteSent: Boolean(inviteSent),
    };

    let guest;
    if (id) {
      const existing = await prisma.guest.findUnique({ where: { id } });
      guest = await prisma.guest.update({
        where: { id },
        data: { ...data, inviteSentAt: stampSentAt(data.inviteSent, existing?.inviteSentAt) },
      });
    } else {
      guest = await prisma.guest.upsert({
        where: { guestCode: data.guestCode },
        update: data,
        create: { ...data, inviteSentAt: data.inviteSent ? new Date() : null },
      });
    }

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
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, inviteSent } = (await req.json()) ?? {};
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const existing = await prisma.guest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const sent = Boolean(inviteSent);
  const guest = await prisma.guest.update({
    where: { id },
    data: { inviteSent: sent, inviteSentAt: stampSentAt(sent, existing.inviteSentAt) },
  });
  return NextResponse.json({ ok: true, guest });
}

export async function DELETE(req: NextRequest) {  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await prisma.guest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

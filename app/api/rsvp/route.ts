import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestCode, status, guestCount } = body ?? {};

    if (!guestCode || typeof guestCode !== "string") {
      return NextResponse.json({ error: "guestCode is required" }, { status: 400 });
    }
    if (status !== "ATTENDING" && status !== "DECLINED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const count = Number(guestCount);
    const safeCount =
      status === "DECLINED" ? 0 : Math.min(Math.max(Number.isFinite(count) ? count : 1, 1), 5);

    const existing = await prisma.guest.findUnique({ where: { guestCode } });
    if (!existing) {
      return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
    }

    const guest = await prisma.guest.update({
      where: { guestCode },
      data: { status, guestCount: safeCount },
    });

    return NextResponse.json({ ok: true, guest });
  } catch (err) {
    console.error("RSVP error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const guestCode = req.nextUrl.searchParams.get("code");
  if (!guestCode) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  const guest = await prisma.guest.findUnique({ where: { guestCode } });
  if (!guest) {
    return NextResponse.json({ error: "Gæst ikke fundet" }, { status: 404 });
  }
  return NextResponse.json({ guest });
}

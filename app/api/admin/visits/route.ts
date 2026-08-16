import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireAdmin } from "@/lib/adminAuth";
import { DEMO_CODE } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** How many days of history the panel offers. */
const WINDOWS = [7, 30, 0] as const;

type Row = { key: string; visits: number; visitors: number };

/**
 * Counts a column, biggest first, keeping track of people as well as arrivals:
 * "42 visits from 9 phones" says more than either number on its own.
 */
function tally<T extends { visitorId: string }>(
  visits: T[],
  keyOf: (visit: T) => string,
  limit = 20
): Row[] {
  const seen = new Map<string, { visits: number; visitors: Set<string> }>();
  for (const visit of visits) {
    const key = keyOf(visit) || "—";
    const row = seen.get(key) ?? { visits: 0, visitors: new Set<string>() };
    row.visits += 1;
    if (visit.visitorId) row.visitors.add(visit.visitorId);
    seen.set(key, row);
  }
  return [...seen.entries()]
    .map(([key, row]) => ({ key, visits: row.visits, visitors: row.visitors.size }))
    .sort((a, b) => b.visits - a.visits || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * Who has looked at the invitation. Aggregated on the way out — the panel never
 * sees an individual visit, only the shape of them.
 */
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const asked = Number(req.nextUrl.searchParams.get("days"));
  const days = (WINDOWS as readonly number[]).includes(asked) ? asked : 30;
  const since = days > 0 ? new Date(Date.now() - days * 86_400_000) : undefined;

  const [visits, guests] = await Promise.all([
    prisma.visit.findMany({
      where: since ? { createdAt: { gte: since } } : {},
      orderBy: { createdAt: "desc" },
      take: 20_000,
    }),
    prisma.guest.findMany({ select: { guestCode: true, name: true } }),
  ]);

  const names = new Map(guests.map((g) => [g.guestCode, g.name]));
  const real = visits.filter((v) => !v.demo && v.guestCode);
  const openedCodes = new Set(real.map((v) => v.guestCode));

  // The last day somebody opened each invitation, so a host can see at a glance
  // who has never looked and might need a nudge before the deadline.
  const lastSeen = new Map<string, string>();
  for (const visit of real) {
    if (!lastSeen.has(visit.guestCode)) {
      lastSeen.set(visit.guestCode, visit.createdAt.toISOString());
    }
  }

  return NextResponse.json({
    days,
    windows: WINDOWS,
    totals: {
      visits: visits.length,
      visitors: new Set(visits.map((v) => v.visitorId).filter(Boolean)).size,
      demo: visits.filter((v) => v.demo).length,
      invitations: real.length,
      opened: openedCodes.size,
      invited: guests.length,
    },
    countries: tally(visits, (v) => v.country),
    browsers: tally(visits, (v) => v.browser),
    systems: tally(visits, (v) => v.os),
    devices: tally(visits, (v) => v.device),
    languages: tally(visits, (v) => v.lang),
    referrers: tally(
      visits.filter((v) => v.referrer),
      (v) => v.referrer
    ),
    // Per day, oldest first, for the little bar chart in the panel.
    daily: tally(visits, (v) => v.createdAt.toISOString().slice(0, 10), 60).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
    guests: guests
      .map((g) => ({
        guestCode: g.guestCode,
        name: g.name,
        visits: real.filter((v) => v.guestCode === g.guestCode).length,
        lastSeen: lastSeen.get(g.guestCode) ?? null,
      }))
      .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name)),
    demoCode: DEMO_CODE,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safeId, safeString } from "@/lib/security";
import { referrerHost, visitFacts } from "@/lib/visitInfo";
import { isDemoCode } from "@/lib/demo";

export const dynamic = "force-dynamic";

/**
 * Records that an invitation was opened. Fire-and-forget from the page: it
 * answers nothing the guest needs, so it never blocks or fails their visit.
 */
export async function POST(req: NextRequest) {
  const limit = rateLimit(`visit:${clientIp(req)}`, RATE_RULES.publicWrite);
  if (!limit.ok) return NextResponse.json({ ok: true });

  const body = await readJson<{ code?: unknown; lang?: unknown; referrer?: unknown }>(
    req,
    2048
  );
  if (!body.ok) return NextResponse.json({ ok: true });

  const code = safeId(body.data.code) ?? "";
  const facts = visitFacts(req);

  try {
    await prisma.visit.create({
      data: {
        ...facts,
        guestCode: code,
        demo: isDemoCode(code),
        lang: safeString(body.data.lang, { max: 5 }) ?? "",
        referrer: referrerHost(body.data.referrer),
      },
    });
  } catch {
    // A visit that cannot be counted is not worth a broken invitation.
  }

  return NextResponse.json({ ok: true });
}

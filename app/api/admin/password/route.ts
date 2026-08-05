import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isAuthFailure,
  requireAdmin,
  revokeOtherSessions,
  toSafeAdmin,
} from "@/lib/adminAuth";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/password";
import { clientIp, readJson, safePassword } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Changes the signed-in admin's own password.
 *
 * Reachable while `mustChangePassword` is set — it is the only thing a
 * temporary password may do. The current password is always required, so a
 * stolen session cookie alone cannot lock the real owner out, and every other
 * browser is signed out once the change lands.
 */
export async function POST(req: NextRequest) {
  const limit = rateLimit(`password:${clientIp(req)}`, RATE_RULES.destructive);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "For mange forsøg. Prøv igen senere." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const session = await requireAdmin(req, { allowPasswordChangePending: true });
  if (isAuthFailure(session)) return session.response;

  const body = await readJson<{ currentPassword?: unknown; newPassword?: unknown }>(
    req,
    2048
  );
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const currentPassword = safePassword(body.data.currentPassword);
  const newPassword = safePassword(body.data.newPassword);

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Både nuværende og ny adgangskode er påkrævet" },
      { status: 400 }
    );
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: session.admin.id } });
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await verifyPassword(currentPassword, admin.passwordHash))) {
    await audit({
      action: "PASSWORD_REJECTED",
      actorName: admin.username,
      actorId: admin.id,
      success: false,
      detail: "Current password did not match",
      req,
    });
    return NextResponse.json(
      { error: "Nuværende adgangskode er forkert" },
      { status: 401 }
    );
  }

  const strength = checkPasswordStrength(newPassword, admin.username);
  if (!strength.ok) {
    await audit({
      action: "PASSWORD_REJECTED",
      actorName: admin.username,
      actorId: admin.id,
      success: false,
      detail: `New password too weak: ${strength.problems.join(", ")}`,
      req,
    });
    return NextResponse.json(
      { error: "Adgangskoden er for svag", code: "WEAK_PASSWORD", problems: strength.problems },
      { status: 400 }
    );
  }

  if (await verifyPassword(newPassword, admin.passwordHash)) {
    return NextResponse.json(
      { error: "Den nye adgangskode skal være en anden end den nuværende", code: "REUSED" },
      { status: 400 }
    );
  }

  const updated = await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  await revokeOtherSessions(admin.id, session.sessionId);

  await audit({
    action: "PASSWORD_CHANGED",
    actorName: admin.username,
    actorId: admin.id,
    targetType: "admin",
    targetId: admin.username,
    detail: "Password changed; all other sessions signed out",
    req,
  });

  return NextResponse.json({ ok: true, admin: toSafeAdmin(updated) });
}

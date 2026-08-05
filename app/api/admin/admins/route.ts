import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  countAdmins,
  isAuthFailure,
  requireAdmin,
  toSafeAdmin,
} from "@/lib/adminAuth";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { checkPasswordStrength, hashPassword } from "@/lib/password";
import { clientIp, readJson, safeId, safePassword, safeUsername } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Administrator management.
 *
 * The one invariant this file exists to protect: there must always be at least
 * one administrator. An admin may add colleagues and may even remove their own
 * account — but the last one standing cannot be deleted, so the panel can never
 * be locked away from everybody.
 */

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    admins: admins.map(toSafeAdmin),
    currentAdminId: session.admin.id,
  });
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`admins:${clientIp(req)}`, RATE_RULES.destructive);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "For mange forsøg. Prøv igen senere." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const body = await readJson<{ username?: unknown; password?: unknown }>(req, 2048);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const username = safeUsername(body.data.username);
  const password = safePassword(body.data.password);

  if (!username) {
    return NextResponse.json(
      { error: "Brugernavn skal være 3–32 tegn (a–z, 0–9, . _ -)", code: "BAD_USERNAME" },
      { status: 400 }
    );
  }
  if (!password) {
    return NextResponse.json({ error: "Adgangskode er påkrævet" }, { status: 400 });
  }

  const strength = checkPasswordStrength(password, username);
  if (!strength.ok) {
    return NextResponse.json(
      {
        error: "Adgangskoden opfylder ikke alle krav",
        code: "WEAK_PASSWORD",
        field: "password",
        problems: strength.problems,
        rules: strength.rules,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Brugernavnet findes allerede" }, { status: 409 });
  }

  const created = await prisma.adminUser.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      // Even a strong hand-over password is a shared secret until the new
      // admin replaces it with one only they know.
      mustChangePassword: true,
      createdByName: session.admin.username,
    },
  });

  await audit({
    action: "ADMIN_CREATED",
    actorName: session.admin.username,
    actorId: session.admin.id,
    targetType: "admin",
    targetId: created.username,
    detail: "New administrator created; must set their own password at first login",
    req,
  });

  return NextResponse.json({ ok: true, admin: toSafeAdmin(created) });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const id = safeId(req.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id er påkrævet" }, { status: 400 });
  }

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Administratoren findes ikke" }, { status: 404 });
  }

  if ((await countAdmins()) <= 1) {
    await audit({
      action: "ADMIN_DELETED",
      actorName: session.admin.username,
      actorId: session.admin.id,
      targetType: "admin",
      targetId: target.username,
      success: false,
      detail: "Refused: the last administrator cannot be removed",
      req,
    });
    return NextResponse.json(
      { error: "Der skal altid være mindst én administrator", code: "LAST_ADMIN" },
      { status: 409 }
    );
  }

  // Cascade removes the sessions, so a deleted admin is signed out everywhere.
  await prisma.adminUser.delete({ where: { id } });

  const removedSelf = target.id === session.admin.id;
  await audit({
    action: "ADMIN_DELETED",
    actorName: session.admin.username,
    actorId: session.admin.id,
    targetType: "admin",
    targetId: target.username,
    detail: removedSelf ? "Removed their own account" : "Removed another administrator",
    req,
  });

  const res = NextResponse.json({ ok: true, removedSelf });
  if (removedSelf) clearSessionCookie(res);
  return res;
}

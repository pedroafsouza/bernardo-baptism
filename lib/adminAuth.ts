import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { clientIp, userAgent } from "@/lib/security";
import { generateToken, hashPassword, verifyPassword } from "@/lib/password";

/**
 * Database-backed admin authentication.
 *
 * The old mechanism compared a username and a password straight out of the
 * environment and then handed the browser the shared secret itself, so every
 * logged-in tab carried a credential that never expired and could not be
 * revoked. This replaces it with real accounts: salted scrypt hashes in the
 * database, opaque per-browser session tokens (only their digest is stored),
 * expiry, revocation and lockout.
 */

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Documented first-run credentials. They are useless until changed. */
export const BOOTSTRAP_USERNAME = "admin";
export const BOOTSTRAP_PASSWORD = "admin";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type AdminUserSafe = {
  id: string;
  username: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdByName: string | null;
};

export function toSafeAdmin(a: {
  id: string;
  username: string;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  createdByName: string | null;
}): AdminUserSafe {
  return {
    id: a.id,
    username: a.username,
    mustChangePassword: a.mustChangePassword,
    lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    createdByName: a.createdByName,
  };
}

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Guarantees there is always exactly one way in on a fresh database: the
 * documented admin/admin pair, which the panel refuses to use for anything
 * until a strong password replaces it.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const count = await prisma.adminUser.count();
  if (count > 0) return;
  await prisma.adminUser.create({
    data: {
      username: BOOTSTRAP_USERNAME,
      passwordHash: await hashPassword(BOOTSTRAP_PASSWORD),
      mustChangePassword: true,
      createdByName: "system",
    },
  });
  await audit({
    action: "ADMIN_BOOTSTRAPPED",
    actorName: "system",
    targetType: "admin",
    targetId: BOOTSTRAP_USERNAME,
    detail: "First-run admin created with a temporary password",
  });
}

export type LoginOutcome =
  | { ok: true; admin: NonNullable<Awaited<ReturnType<typeof findAdmin>>>; token: string }
  | { ok: false; reason: "INVALID" | "LOCKED"; retryAfterMs?: number };

async function findAdmin(username: string) {
  return prisma.adminUser.findUnique({ where: { username } });
}

export async function attemptLogin(
  username: string,
  password: string,
  req: NextRequest
): Promise<LoginOutcome> {
  await ensureBootstrapAdmin();

  const admin = await findAdmin(username);

  if (!admin) {
    // Spend comparable time on an unknown user so the response time does not
    // reveal which usernames exist.
    await verifyPassword(password, "scrypt$16384$8$1$00$00");
    return { ok: false, reason: "INVALID" };
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      reason: "LOCKED",
      retryAfterMs: admin.lockedUntil.getTime() - Date.now(),
    };
  }

  const valid = await verifyPassword(password, admin.passwordHash);

  if (!valid) {
    const attempts = admin.failedAttempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });
    if (lock) {
      await audit({
        action: "LOGIN_LOCKED",
        actorName: admin.username,
        actorId: admin.id,
        success: false,
        detail: `Account locked for ${LOCKOUT_MS / 60000} minutes after ${MAX_FAILED_ATTEMPTS} failed attempts`,
        req,
      });
      return { ok: false, reason: "LOCKED", retryAfterMs: LOCKOUT_MS };
    }
    return { ok: false, reason: "INVALID" };
  }

  const token = generateToken();
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
    prisma.adminSession.create({
      data: {
        tokenHash: digest(token),
        adminId: admin.id,
        ip: clientIp(req),
        userAgent: userAgent(req),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    }),
  ]);

  // Opportunistic housekeeping — expired rows are worthless.
  await prisma.adminSession
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - SESSION_TTL_MS) } } })
    .catch(() => undefined);

  return { ok: true, admin, token };
}

export type ResolvedSession = {
  admin: {
    id: string;
    username: string;
    mustChangePassword: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    createdByName: string | null;
  };
  sessionId: string;
};

/** Resolves the cookie into a live session, or null. */
export async function resolveSession(req: NextRequest): Promise<ResolvedSession | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 200) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: digest(token) },
    include: { admin: true },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  // Cheap sliding "last seen" without writing on every single request.
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    await prisma.adminSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    admin: {
      id: session.admin.id,
      username: session.admin.username,
      mustChangePassword: session.admin.mustChangePassword,
      lastLoginAt: session.admin.lastLoginAt,
      createdAt: session.admin.createdAt,
      createdByName: session.admin.createdByName,
    },
    sessionId: session.id,
  };
}

export type AuthFailure = { response: NextResponse };

/**
 * Gate for every admin endpoint. An account that still holds a temporary
 * password can reach nothing except "change my password".
 */
export async function requireAdmin(
  req: NextRequest,
  opts: { allowPasswordChangePending?: boolean } = {}
): Promise<ResolvedSession | AuthFailure> {
  const session = await resolveSession(req);

  if (!session) {
    await audit({
      action: "UNAUTHORIZED",
      success: false,
      detail: `${req.method} ${req.nextUrl.pathname}`,
      req,
    });
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (session.admin.mustChangePassword && !opts.allowPasswordChangePending) {
    return {
      response: NextResponse.json(
        {
          error: "Password change required",
          code: "PASSWORD_CHANGE_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  return session;
}

export function isAuthFailure(
  value: ResolvedSession | AuthFailure
): value is AuthFailure {
  return (value as AuthFailure).response !== undefined;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  // The pre-account cookie must not linger and confuse anyone.
  res.cookies.set("admin_secret", "", { path: "/", maxAge: 0 });
}

export async function revokeSession(req: NextRequest): Promise<void> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;
  await prisma.adminSession
    .updateMany({ where: { tokenHash: digest(token) }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

/** After a password change every other browser is logged out. */
export async function revokeOtherSessions(adminId: string, keepSessionId?: string) {
  await prisma.adminSession.updateMany({
    where: {
      adminId,
      revokedAt: null,
      ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function countAdmins(): Promise<number> {
  return prisma.adminUser.count();
}

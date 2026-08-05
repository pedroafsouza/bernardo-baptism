import { NextRequest, NextResponse } from "next/server";
import {
  attemptLogin,
  clearSessionCookie,
  ensureBootstrapAdmin,
  resolveSession,
  revokeSession,
  setSessionCookie,
  toSafeAdmin,
} from "@/lib/adminAuth";
import { audit } from "@/lib/audit";
import { RATE_RULES, rateLimit, resetRateLimit } from "@/lib/rateLimit";
import { clientIp, readJson, safePassword, safeUsername } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Exchanges a username and password for an opaque, revocable session cookie.
 *
 * Two independent throttles guard it: one per IP (so a single host cannot walk
 * a password list) and one per account (so a botnet spread over many addresses
 * cannot either). Every outcome — good, bad or throttled — is audited.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const ipLimit = rateLimit(`login:ip:${ip}`, RATE_RULES.login);
  if (!ipLimit.ok) {
    await audit({
      action: "RATE_LIMITED",
      success: false,
      detail: "Too many login attempts from this address",
      req,
    });
    return NextResponse.json(
      { error: "For mange forsøg. Prøv igen senere.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter) } }
    );
  }

  const body = await readJson<{ username?: unknown; password?: unknown }>(req, 2048);
  if (!body.ok) {
    if (body.reason === "MALICIOUS") {
      await audit({
        action: "REQUEST_BLOCKED",
        success: false,
        detail: "Malicious payload on /api/admin/login",
        req,
      });
    }
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const username = safeUsername(body.data.username);
  const password = safePassword(body.data.password);

  if (!username || !password) {
    await audit({
      action: "LOGIN_FAILED",
      actorName:
        typeof body.data.username === "string"
          ? body.data.username.slice(0, 64)
          : "anonymous",
      success: false,
      detail: "Malformed credentials",
      req,
    });
    return NextResponse.json(
      { error: "Forkert brugernavn eller adgangskode" },
      { status: 401 }
    );
  }

  const accountLimit = rateLimit(`login:user:${username}`, RATE_RULES.loginAccount);
  if (!accountLimit.ok) {
    await audit({
      action: "RATE_LIMITED",
      actorName: username,
      success: false,
      detail: "Too many login attempts for this account",
      req,
    });
    return NextResponse.json(
      { error: "For mange forsøg. Prøv igen senere.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(accountLimit.retryAfter) } }
    );
  }

  const outcome = await attemptLogin(username, password, req);

  if (!outcome.ok) {
    if (outcome.reason === "LOCKED") {
      return NextResponse.json(
        { error: "Kontoen er midlertidigt låst efter for mange forsøg.", code: "LOCKED" },
        { status: 423 }
      );
    }
    await audit({
      action: "LOGIN_FAILED",
      actorName: username,
      success: false,
      detail: "Wrong username or password",
      req,
    });
    return NextResponse.json(
      { error: "Forkert brugernavn eller adgangskode" },
      { status: 401 }
    );
  }

  resetRateLimit(`login:ip:${ip}`);
  resetRateLimit(`login:user:${username}`);

  await audit({
    action: "LOGIN_SUCCESS",
    actorName: outcome.admin.username,
    actorId: outcome.admin.id,
    detail: outcome.admin.mustChangePassword
      ? "Signed in with a temporary password — must change it"
      : "Signed in",
    req,
  });

  const res = NextResponse.json({
    ok: true,
    admin: toSafeAdmin(outcome.admin),
    mustChangePassword: outcome.admin.mustChangePassword,
  });
  setSessionCookie(res, outcome.token);
  return res;
}

/** Who am I? The panel calls this on load to decide what to render. */
export async function GET(req: NextRequest) {
  await ensureBootstrapAdmin();
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    admin: toSafeAdmin(session.admin),
    mustChangePassword: session.admin.mustChangePassword,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await resolveSession(req);
  await revokeSession(req);
  if (session) {
    await audit({
      action: "LOGOUT",
      actorName: session.admin.username,
      actorId: session.admin.id,
      req,
    });
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

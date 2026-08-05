import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireAdmin } from "@/lib/adminAuth";
import { AUDIT_ACTIONS, audit, type AuditAction } from "@/lib/audit";
import { readJson, safeId, safeString } from "@/lib/security";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const MAX_PAGE = 200;

/** Paginated, filterable view of the audit trail for the admin panel. */
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const params = req.nextUrl.searchParams;
  const actionParam = params.get("action");
  const action =
    actionParam && (AUDIT_ACTIONS as readonly string[]).includes(actionParam)
      ? (actionParam as AuditAction)
      : null;
  const actor = safeString(params.get("actor") ?? undefined, { max: 64 });
  const page = Math.min(Math.max(Number(params.get("page")) || 1, 1), MAX_PAGE);

  const where = {
    ...(action ? { action } : {}),
    ...(actor ? { actorName: actor } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const actors = await prisma.auditLog.findMany({
    distinct: ["actorName"],
    select: { actorName: true },
    orderBy: { actorName: "asc" },
    take: 50,
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      action: e.action,
      actorName: e.actorName,
      targetType: e.targetType,
      targetId: e.targetId,
      detail: e.detail,
      ip: e.ip,
      success: e.success,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    actions: AUDIT_ACTIONS,
    actors: actors.map((a) => a.actorName),
  });
}

/**
 * Records the handful of meaningful actions that only happen in the browser —
 * opening an invitation message, copying a guest's personal link. Restricted to
 * that allowlist so the trail cannot be polluted with invented events.
 */
const CLIENT_ACTIONS: AuditAction[] = ["INVITE_MESSAGE_OPENED", "GUEST_LINK_COPIED"];

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isAuthFailure(session)) return session.response;

  const body = await readJson<{ action?: unknown; guestCode?: unknown; detail?: unknown }>(
    req,
    2048
  );
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.status });

  const action = CLIENT_ACTIONS.find((a) => a === body.data.action);
  if (!action) {
    return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  }

  await audit({
    action,
    actorName: session.admin.username,
    actorId: session.admin.id,
    targetType: "guest",
    targetId: safeId(body.data.guestCode) ?? undefined,
    detail: safeString(body.data.detail, { max: 200 }) ?? undefined,
    req,
  });

  return NextResponse.json({ ok: true });
}

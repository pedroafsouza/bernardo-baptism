import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, userAgent } from "@/lib/security";

/**
 * The audit trail.
 *
 * Everything an administrator can do to somebody else's data leaves a row here:
 * who did it, from where, to whom, and whether it worked. Failed logins and
 * blocked requests are recorded too — an attack you cannot see is one you
 * cannot answer.
 */
export const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_LOCKED",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_REJECTED",
  "ADMIN_CREATED",
  "ADMIN_DELETED",
  "ADMIN_BOOTSTRAPPED",
  "GUEST_CREATED",
  "GUEST_UPDATED",
  "GUEST_DELETED",
  "INVITE_MARKED_SENT",
  "INVITE_MARKED_UNSENT",
  "INVITE_MESSAGE_OPENED",
  "GUEST_LINK_COPIED",
  "RSVP_SUBMITTED",
  "DATABASE_RESET",
  "RATE_LIMITED",
  "REQUEST_BLOCKED",
  "UNAUTHORIZED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntry = {
  action: AuditAction;
  actorName?: string | null;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
  success?: boolean;
  req?: NextRequest | Request | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Never throws: an audit failure must not take down the action it describes,
 * but it must be visible in the server log.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorName: entry.actorName?.slice(0, 64) || "anonymous",
        actorId: entry.actorId ?? null,
        targetType: entry.targetType?.slice(0, 32) ?? null,
        targetId: entry.targetId?.slice(0, 120) ?? null,
        detail: entry.detail?.slice(0, 500) ?? null,
        success: entry.success ?? true,
        ip: entry.ip ?? (entry.req ? clientIp(entry.req) : null),
        userAgent: entry.userAgent ?? (entry.req ? userAgent(entry.req) : null),
      },
    });
  } catch (err) {
    console.error("Audit write failed", entry.action, err);
  }
}

const RETENTION_DAYS = 365;

/** Keeps the trail from growing without bound on a tiny SQLite file. */
export async function pruneAuditLog(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}

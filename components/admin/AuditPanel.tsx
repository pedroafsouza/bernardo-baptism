"use client";

import { useCallback, useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import type { AdminDict } from "@/lib/adminI18n";

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  actorName: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  ip: string | null;
  success: boolean;
};

/** Icon and colour per action, so the trail is scannable at a glance. */
const LOOK: Record<string, { icon: IconName; className: string }> = {
  LOGIN_SUCCESS: { icon: "lock", className: "bg-pastel-green" },
  LOGIN_FAILED: { icon: "warning", className: "bg-pastel-pink" },
  LOGIN_LOCKED: { icon: "lock", className: "bg-pastel-pink" },
  LOGOUT: { icon: "logout", className: "bg-pastel-blue" },
  PASSWORD_CHANGED: { icon: "key", className: "bg-pastel-green" },
  PASSWORD_REJECTED: { icon: "warning", className: "bg-pastel-pink" },
  ADMIN_CREATED: { icon: "addGuest", className: "bg-pastel-green" },
  ADMIN_DELETED: { icon: "trash", className: "bg-pastel-pink" },
  ADMIN_BOOTSTRAPPED: { icon: "user", className: "bg-pastel-yellow" },
  GUEST_CREATED: { icon: "addGuest", className: "bg-pastel-blue" },
  GUEST_UPDATED: { icon: "edit", className: "bg-pastel-blue" },
  GUEST_DELETED: { icon: "trash", className: "bg-pastel-pink" },
  INVITE_MARKED_SENT: { icon: "sent", className: "bg-pastel-green" },
  INVITE_MARKED_UNSENT: { icon: "sent", className: "bg-pastel-yellow" },
  INVITE_MESSAGE_OPENED: { icon: "mail", className: "bg-pastel-cream" },
  GUEST_LINK_COPIED: { icon: "copy", className: "bg-pastel-cream" },
  RSVP_SUBMITTED: { icon: "attending", className: "bg-pastel-green" },
  RSVP_EDITED: { icon: "edit", className: "bg-pastel-green" },
  DATABASE_RESET: { icon: "warning", className: "bg-pastel-pink" },
  RATE_LIMITED: { icon: "warning", className: "bg-pastel-yellow" },
  REQUEST_BLOCKED: { icon: "warning", className: "bg-pastel-pink" },
  UNAUTHORIZED: { icon: "lock", className: "bg-pastel-yellow" },
};

/**
 * The audit menu: who signed in, which invitations went out, what was changed,
 * and every attempt that was refused.
 */
export default function AuditPanel({ t, locale }: { t: AdminDict; locale: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [action, setAction] = useState("ALL");
  const [actor, setActor] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (action !== "ALL") params.set("action", action);
      if (actor !== "ALL") params.set("actor", actor);
      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(t.couldNotLoad);
      const data = await res.json();
      setRows(data.entries || []);
      setActions(data.actions || []);
      setActors(data.actors || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, action, actor, t.couldNotLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="bg-white border-4 border-black p-4">
      <h2 className="text-[17px] mb-1 flex items-center gap-2">
        <Icon name="keyboard" /> {t.auditTitle}
      </h2>
      <p className="text-[13px] opacity-70 mb-4">{t.auditIntro}</p>

      <div className="flex gap-3 flex-wrap text-[14px] mb-3">
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="border-4 border-black p-2 bg-white"
        >
          <option value="ALL">{t.allActions}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {t.auditAction(a)}
            </option>
          ))}
        </select>
        <select
          value={actor}
          onChange={(e) => {
            setPage(1);
            setActor(e.target.value);
          }}
          className="border-4 border-black p-2 bg-white"
        >
          <option value="ALL">{t.allActors}</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          onClick={() => void load()}
          className="pixel-btn bg-pastel-blue border-4 border-black px-3 py-2 flex items-center gap-2"
        >
          <Icon name="spinner" spin={loading} /> {t.refresh}
        </button>
        <span className="self-center opacity-70">{t.auditCount(total)}</span>
      </div>

      {error && (
        <p className="text-red-600 text-[14px] mb-3 flex items-center gap-2">
          <Icon name="warning" /> {error}
        </p>
      )}

      <div className="overflow-x-auto border-4 border-black">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead className="bg-pastel-blue">
            <tr>
              {[t.colWhen, t.colAction, t.colWho, t.colTarget, t.colDetail, t.colIp].map((h) => (
                <th key={h} className="p-2 text-left border-b-4 border-black">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const look = LOOK[r.action] ?? { icon: "question" as IconName, className: "bg-white" };
              return (
                <tr key={r.id} className="border-b-2 border-black/10">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString(locale)}
                  </td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 border-2 border-black ${
                        r.success ? look.className : "bg-pastel-pink"
                      }`}
                    >
                      <Icon name={look.icon} /> {t.auditAction(r.action)}
                    </span>
                  </td>
                  <td className="p-2">{r.actorName}</td>
                  <td className="p-2">
                    {r.targetId ? (
                      <span>
                        {r.targetId}
                        {r.targetType && <span className="opacity-50"> ({r.targetType})</span>}
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td className="p-2">{r.detail || <span className="opacity-40">—</span>}</td>
                  <td className="p-2 opacity-70">{r.ip || "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center opacity-60">
                  {t.auditEmpty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-3 text-[14px]">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="pixel-btn bg-pastel-yellow border-2 border-black px-3 py-1 flex items-center gap-1 disabled:opacity-40"
        >
          <Icon name="left" /> {t.previous}
        </button>
        <span className="opacity-70">{t.pageOf(page, pages)}</span>
        <button
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages}
          className="pixel-btn bg-pastel-yellow border-2 border-black px-3 py-1 flex items-center gap-1 disabled:opacity-40"
        >
          {t.next} <Icon name="right" />
        </button>
      </div>
    </div>
  );
}

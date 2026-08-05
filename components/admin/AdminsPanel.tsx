"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { AdminDict } from "@/lib/adminI18n";

export type AdminUserRow = {
  id: string;
  username: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdByName: string | null;
};

/**
 * The Access menu.
 *
 * An administrator may invite colleagues and may remove anybody — including
 * themselves. The single rule, enforced on the server and mirrored here so the
 * button is simply not offered, is that the last administrator stays.
 */
export default function AdminsPanel({
  t,
  locale,
  onSelfRemoved,
}: {
  t: AdminDict;
  locale: string;
  onSelfRemoved: () => void;
}) {
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins", { credentials: "same-origin" });
      if (!res.ok) throw new Error(t.couldNotLoad);
      const data = await res.json();
      setAdmins(data.admins || []);
      setCurrentId(data.currentAdminId ?? null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [t.couldNotLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProblems([]);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblems(Array.isArray(data.problems) ? data.problems : []);
        throw new Error(data.error || t.couldNotSave);
      }
      setNotice(t.adminCreated(username));
      setUsername("");
      setPassword("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeAdmin(admin: AdminUserRow) {
    const self = admin.id === currentId;
    if (!confirm(self ? t.removeSelfConfirm : t.removeAdminConfirm(admin.username))) return;
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/admin/admins?id=${encodeURIComponent(admin.id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t.couldNotSave);
      return;
    }
    if (data.removedSelf) {
      onSelfRemoved();
      return;
    }
    setNotice(t.adminRemoved(admin.username));
    await load();
  }

  const canRemove = admins.length > 1;

  return (
    <div className="space-y-4">
      <div className="bg-white border-4 border-black p-4">
        <h2 className="text-[17px] mb-1 flex items-center gap-2">
          <Icon name="guests" /> {t.adminsTitle}
        </h2>
        <p className="text-[13px] opacity-70 mb-4">{t.adminsIntro}</p>

        {loading ? (
          <p className="text-[14px] flex items-center gap-2">
            <Icon name="spinner" spin /> {t.loading}
          </p>
        ) : (
          <div className="overflow-x-auto border-4 border-black">
            <table className="w-full text-[14px] min-w-[620px]">
              <thead className="bg-pastel-blue">
                <tr>
                  {[t.colAdmin, t.colStatusAdmin, t.colLastLogin, t.colCreated, t.colActions].map(
                    (h) => (
                      <th key={h} className="p-2 text-left border-b-4 border-black">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b-2 border-black/10">
                    <td className="p-2">
                      <span className="flex items-center gap-2">
                        <Icon name="user" />
                        {a.username}
                        {a.id === currentId && (
                          <span className="opacity-60">({t.you})</span>
                        )}
                      </span>
                    </td>
                    <td className="p-2">
                      {a.mustChangePassword ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black bg-pastel-yellow">
                          <Icon name="warning" /> {t.temporaryPassword}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black bg-pastel-green">
                          <Icon name="done" /> {t.active}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString(locale) : "—"}
                    </td>
                    <td className="p-2">
                      {new Date(a.createdAt).toLocaleDateString(locale)}
                      {a.createdByName && (
                        <span className="opacity-50"> · {a.createdByName}</span>
                      )}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => removeAdmin(a)}
                        disabled={!canRemove}
                        title={canRemove ? undefined : t.lastAdminProtected}
                        className="pixel-btn bg-pastel-pink border-2 border-black px-2 py-1 flex items-center gap-1 disabled:opacity-40"
                      >
                        <Icon name="trash" />
                        {a.id === currentId ? t.removeSelf : t.remove}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!canRemove && !loading && (
          <p className="text-[13px] mt-2 opacity-70 flex items-center gap-2">
            <Icon name="lock" /> {t.lastAdminProtected}
          </p>
        )}
      </div>

      <form onSubmit={createAdmin} className="bg-white border-4 border-black p-4">
        <h2 className="text-[17px] mb-1 flex items-center gap-2">
          <Icon name="addGuest" /> {t.addAdmin}
        </h2>
        <p className="text-[13px] opacity-70 mb-3">{t.addAdminIntro}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[13px] mb-1 opacity-70">{t.username}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.usernamePlaceholder}
              autoComplete="off"
              required
              className="w-full border-4 border-black p-2 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-[13px] mb-1 opacity-70">{t.temporaryPasswordLabel}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full border-4 border-black p-2 text-[14px]"
            />
          </div>
          <button
            disabled={saving}
            className="pixel-btn bg-pastel-green border-4 border-black py-2 px-4 text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Icon name={saving ? "spinner" : "check"} spin={saving} /> {t.createAdmin}
          </button>
        </div>

        <div className="bg-pastel-cream border-4 border-black p-3 text-[13px] mt-3">
          <div className="mb-1 flex items-center gap-2">
            <Icon name="lock" /> {t.passwordRulesTitle}
          </div>
          <ul className="list-disc pl-5 space-y-0.5 opacity-80">
            {t.passwordRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        {problems.length > 0 && (
          <ul className="text-red-600 text-[13px] mt-3 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{t.passwordProblem(p)}</li>
            ))}
          </ul>
        )}
        {error && (
          <p className="text-red-600 text-[14px] mt-3 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}
        {notice && (
          <p className="text-green-700 text-[14px] mt-3 flex items-center gap-2">
            <Icon name="done" /> {notice}
          </p>
        )}
      </form>
    </div>
  );
}

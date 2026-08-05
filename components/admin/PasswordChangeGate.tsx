"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { AdminDict } from "@/lib/adminI18n";

/**
 * Forced password change.
 *
 * Shown as a wall — not a dismissible prompt — whenever the signed-in account
 * still carries a temporary password. The server enforces the same rule, so
 * closing the tab or calling the API directly gains nothing.
 */
export default function PasswordChangeGate({
  t,
  username,
  forced,
  onDone,
  onCancel,
}: {
  t: AdminDict;
  username: string;
  forced: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProblems([]);

    if (next !== repeat) {
      setError(t.passwordsDoNotMatch);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblems(Array.isArray(data.problems) ? data.problems : []);
        setError(data.error || t.couldNotSave);
        return;
      }
      setCurrent("");
      setNext("");
      setRepeat("");
      onDone();
    } catch (err: any) {
      setError(err.message || t.couldNotSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pixel-border bg-pastel-cream border-4 border-black p-6 max-w-lg w-full text-black">
      <h2 className="text-[19px] mb-2 flex items-center gap-2">
        <Icon name="key" /> {forced ? t.mustChangePasswordTitle : t.changePassword}
      </h2>
      <p className="text-[14px] opacity-70 mb-4">
        {forced ? t.mustChangePasswordBody : t.changePasswordBody}{" "}
        <span className="font-bold">{username}</span>
      </p>

      <form onSubmit={submit}>
        <label className="block text-[13px] mb-1 opacity-70">{t.currentPassword}</label>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full border-4 border-black p-3 text-[16px] mb-3 bg-white"
          required
        />

        <label className="block text-[13px] mb-1 opacity-70">{t.newPassword}</label>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full border-4 border-black p-3 text-[16px] mb-3 bg-white"
          required
        />

        <label className="block text-[13px] mb-1 opacity-70">{t.repeatPassword}</label>
        <input
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className="w-full border-4 border-black p-3 text-[16px] mb-3 bg-white"
          required
        />

        <div className="bg-white border-4 border-black p-3 text-[13px] mb-4">
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
          <ul className="text-red-600 text-[13px] mb-3 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{t.passwordProblem(p)}</li>
            ))}
          </ul>
        )}

        {error && (
          <p className="text-red-600 text-[14px] mb-3 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            disabled={saving}
            className="pixel-btn bg-pastel-green border-4 border-black py-3 px-4 text-[15px] flex items-center gap-2 disabled:opacity-60"
          >
            <Icon name={saving ? "spinner" : "check"} spin={saving} />
            {saving ? t.saving : t.savePassword}
          </button>
          {!forced && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="pixel-btn bg-pastel-yellow border-4 border-black py-3 px-4 text-[15px] flex items-center gap-2"
            >
              <Icon name="close" /> {t.cancel}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

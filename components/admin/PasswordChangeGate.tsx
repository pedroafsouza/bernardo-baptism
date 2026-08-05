"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import PasswordRequirements from "@/components/admin/PasswordRequirements";
import type { AdminDict } from "@/lib/adminI18n";
import { checkPasswordStrength } from "@/lib/passwordPolicy";

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
  const [errorField, setErrorField] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // The browser runs the same policy module as the API, so the form can say
  // exactly what is missing before anything is sent — and the two can never
  // disagree about, say, whether "å" counts as a symbol.
  const strength = checkPasswordStrength(next, username);
  const repeatMismatch = repeat.length > 0 && next !== repeat;
  const canSubmit =
    current.length > 0 && strength.ok && repeat.length > 0 && !repeatMismatch;

  function fieldClass(field: string) {
    const bad = errorField === field || (field === "repeatPassword" && repeatMismatch);
    return `w-full border-4 p-3 text-[16px] mb-1 bg-white ${
      bad ? "border-red-600" : "border-black"
    }`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    setProblems([]);

    if (!current) {
      setErrorField("currentPassword");
      setError(t.currentPasswordRequired);
      return;
    }
    if (!strength.ok) {
      setErrorField("newPassword");
      setProblems(strength.problems);
      setError(t.passwordDoesNotMeetRules);
      return;
    }
    if (next !== repeat) {
      setErrorField("repeatPassword");
      setError(t.passwordsDoNotMatch);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next,
          repeatPassword: repeat,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblems(Array.isArray(data.problems) ? data.problems : []);
        setErrorField(typeof data.field === "string" ? data.field : null);
        setError(data.error || t.couldNotSave);
        return;
      }
      setCurrent("");
      setNext("");
      setRepeat("");
      setErrorField(null);
      onDone();
    } catch (err: any) {
      setErrorField(null);
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
          onChange={(e) => {
            setCurrent(e.target.value);
            if (errorField === "currentPassword") {
              setErrorField(null);
              setError(null);
            }
          }}
          className={fieldClass("currentPassword")}
          aria-invalid={errorField === "currentPassword"}
          required
        />
        {errorField === "currentPassword" && error && (
          <p className="text-red-600 text-[13px] mb-3 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}
        <div className="mb-3" />

        <label className="block text-[13px] mb-1 opacity-70">{t.newPassword}</label>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setProblems([]);
            if (errorField === "newPassword") {
              setErrorField(null);
              setError(null);
            }
          }}
          className={fieldClass("newPassword")}
          aria-invalid={errorField === "newPassword"}
          required
        />
        <div className="mb-3" />

        <label className="block text-[13px] mb-1 opacity-70">{t.repeatPassword}</label>
        <input
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => {
            setRepeat(e.target.value);
            if (errorField === "repeatPassword") {
              setErrorField(null);
              setError(null);
            }
          }}
          className={fieldClass("repeatPassword")}
          aria-invalid={errorField === "repeatPassword" || repeatMismatch}
          required
        />
        {repeatMismatch ? (
          <p className="text-red-600 text-[13px] mb-3 flex items-center gap-2">
            <Icon name="warning" /> {t.passwordsDoNotMatch}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <PasswordRequirements
          t={t}
          password={next}
          username={username}
          serverProblems={problems}
        />

        {error && errorField !== "currentPassword" && (
          <p className="text-red-600 text-[14px] mb-3 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            disabled={saving || !canSubmit}
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

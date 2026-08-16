"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import type { AdminDict } from "@/lib/adminI18n";
import { inviteCodeFromName } from "@/lib/inviteCode";

/**
 * What an administrator decides about a household: who they are and how many
 * seats the invitation holds. How many of those seats turn up in the church and
 * how many at the party is the household's own answer, given on their invitation
 * or recorded on their behalf in the guest list.
 */
export type GuestFormValues = {
  id: string;
  guestCode: string;
  name: string;
  group: string;
  status: string;
  maxGuests: number;
  maxKids: number;
  likely: boolean;
  inviteSent: boolean;
};

export const emptyGuestForm: GuestFormValues = {
  id: "",
  guestCode: "",
  name: "",
  group: "Family",
  status: "PENDING",
  maxGuests: 1,
  maxKids: 0,
  likely: true,
  inviteSent: false,
};

type Props = {
  t: AdminDict;
  initial: GuestFormValues;
  groups: readonly string[];
  statuses: readonly string[];
  /** Codes already in use, so a generated one never collides. */
  takenCodes: string[];
  onSave: (values: GuestFormValues) => Promise<boolean>;
  onClose: () => void;
};

const fieldLabel = "text-[11px] uppercase tracking-wide opacity-70";

export default function GuestFormModal({
  t,
  initial,
  groups,
  statuses,
  takenCodes,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState<GuestFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const ok = await onSave(form);
      if (!ok) setError(t.couldNotSave);
    } catch (err: any) {
      setError(err?.message || t.couldNotSave);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={form.id ? t.editGuest : t.addGuest}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="pixel-border relative w-full max-w-2xl bg-pastel-cream border-4 border-black p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto text-black"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] flex items-center gap-2">
              <Icon name={form.id ? "edit" : "addGuest"} />
              {form.id ? t.editGuest : t.addGuest}
            </h2>
            <p className="text-[13px] opacity-60 mt-1">{t.guestAnswersHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="pixel-btn bg-pastel-pink border-4 border-black w-9 h-9 text-sm shrink-0"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={fieldLabel} htmlFor="guest-code">
              {t.colCode}
            </label>
            <div className="flex items-stretch gap-1">
              <input
                required
                id="guest-code"
                ref={firstField}
                value={form.guestCode}
                onChange={(e) => setForm({ ...form, guestCode: e.target.value })}
                placeholder="GUEST_XYZ"
                className="border-4 border-black p-2 text-[14px] w-full min-w-0"
              />
              <button
                type="button"
                title={t.generateCode}
                aria-label={t.generateCode}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    guestCode: inviteCodeFromName(f.name, takenCodes),
                  }))
                }
                className="pixel-btn border-4 border-black bg-pastel-yellow px-2 shrink-0"
              >
                <Icon name="magic" className="h-4 w-4" />
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{t.colName}</span>
            <input
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => {
                  // A new household gets a code proposed as you type, until
                  // somebody types their own; an existing one keeps the code its
                  // guests already have in their pocket.
                  const proposed =
                    !f.guestCode || f.guestCode === inviteCodeFromName(f.name, takenCodes);
                  return {
                    ...f,
                    name,
                    guestCode:
                      f.id || !proposed ? f.guestCode : inviteCodeFromName(name, takenCodes),
                  };
                });
              }}
              placeholder={t.namePlaceholder}
              className="border-4 border-black p-2 text-[14px] w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{t.colGroup}</span>
            <select
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
              className="border-4 border-black p-2 text-[14px] w-full"
            >
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{t.colStatus}</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="border-4 border-black p-2 text-[14px] w-full"
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{t.maxAdults}</span>
            <input
              type="number"
              min={1}
              max={10}
              value={form.maxGuests}
              onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })}
              className="border-4 border-black p-2 text-[14px] w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>{t.maxKids}</span>
            <input
              type="number"
              min={0}
              max={10}
              value={form.maxKids}
              onChange={(e) => setForm({ ...form, maxKids: Number(e.target.value) })}
              className="border-4 border-black p-2 text-[14px] w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={form.likely}
              onChange={(e) => setForm({ ...form, likely: e.target.checked })}
              className="w-4 h-4"
            />
            {t.expectedToCome}
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={form.inviteSent}
              onChange={(e) => setForm({ ...form, inviteSent: e.target.checked })}
              className="w-4 h-4"
            />
            {t.inviteSent}
          </label>
        </div>

        {error && (
          <p className="text-red-700 text-[14px] mt-4 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            type="submit"
            disabled={saving}
            className="pixel-btn bg-pastel-green border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2 disabled:opacity-60"
          >
            <Icon name={saving ? "spinner" : "check"} spin={saving} />
            {form.id ? t.update : t.add}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn bg-pastel-yellow border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
          >
            <Icon name="close" /> {t.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import AnswerButtons from "@/components/admin/AnswerButtons";
import type { AdminDict } from "@/lib/adminI18n";
import { inviteCodeFromName } from "@/lib/inviteCode";
import {
  partyFromAttendees,
  slotsForNames,
  type AttendeeSlot,
  type AttendeeStatus,
} from "@/lib/attendees";
import { countGuestNames, formatNameList, splitGuestNames } from "@/lib/names";
import type { Lang } from "@/lib/lang";

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
  /** Who is on the invitation, and what each of them answered. */
  attendees: AttendeeSlot[];
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
  attendees: [],
};

type Props = {
  t: AdminDict;
  /** The language the panel is being read in, used to join names into a line. */
  lang: Lang;
  initial: GuestFormValues;
  groups: readonly string[];
  statuses: readonly string[];
  /** Codes already in use, so a generated one never collides. */
  takenCodes: string[];
  /**
   * `answersChanged` says whether the individual answers were touched here, so
   * a household opened only to fix a typo is never re-answered behind its back.
   */
  onSave: (values: GuestFormValues, answersChanged: boolean) => Promise<boolean>;
  onClose: () => void;
};

const fieldLabel = "text-[11px] uppercase tracking-wide opacity-70";

/** The status of a household is read off its adults; children never change it. */
const ZERO_KIDS = { church: 0, reception: 0 };

export default function GuestFormModal({
  t,
  lang,
  initial,
  groups,
  statuses,
  takenCodes,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState<GuestFormValues>(initial);
  // The people are held as a list of their own rather than read back off the
  // household line, because a person who has just been added has no name yet
  // and would otherwise disappear between two keystrokes.
  const [names, setNames] = useState<string[]>(() => splitGuestNames(initial.name));
  const [saving, setSaving] = useState(false);
  const [answersChanged, setAnswersChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  // Answers belong to a position, not to a name, so they stay with the person
  // who gave them while the names around them are edited.
  const people = slotsForNames(names, form.attendees);

  /** The code proposed from the name, until somebody types one of their own. */
  function codeFor(f: GuestFormValues, name: string): string {
    const proposed = !f.guestCode || f.guestCode === inviteCodeFromName(f.name, takenCodes);
    return f.id || !proposed ? f.guestCode : inviteCodeFromName(name, takenCodes);
  }

  /**
   * The household line is written from the people on it, so adding "Bo" below
   * "Kitt og Jan" addresses the invitation to all three. A seat set by hand
   * above the head count is left alone; a list that fitted exactly keeps
   * fitting exactly.
   */
  function changePeople(nextNames: string[], nextPeople?: AttendeeSlot[]) {
    setNames(nextNames);
    setForm((f) => {
      const line = formatNameList(nextNames, lang);
      const seats =
        f.maxGuests === names.length ? nextNames.length : Math.max(f.maxGuests, nextNames.length);
      const next: GuestFormValues = {
        ...f,
        name: line,
        maxGuests: Math.min(Math.max(seats, 1), 10),
        guestCode: codeFor(f, line),
      };
      if (!nextPeople) return next;
      // Somebody has left the invitation, taking their answer with them, so the
      // household's numbers have to be counted again.
      return { ...next, attendees: nextPeople, status: partyFromAttendees(nextPeople, ZERO_KIDS).status };
    });
  }

  function removePerson(position: number) {
    setAnswersChanged(true);
    changePeople(
      names.filter((_, i) => i !== position),
      people.filter((p) => p.position !== position).map((p, i) => ({ ...p, position: i }))
    );
  }

  function editPerson(position: number, change: Partial<AttendeeSlot>) {
    setAnswersChanged(true);
    const next = people.map((p) => (p.position === position ? { ...p, ...change } : p));
    // The household's own status is read off its people, never set beside
    // them: two answers that disagree would be one answer too many.
    setForm((f) => ({ ...f, attendees: next, status: partyFromAttendees(next, ZERO_KIDS).status }));
  }

  /** Answering for the whole household at once: everybody, both halves of the day. */
  function answerForEveryone(status: string) {
    setAnswersChanged(true);
    const said = (status === "ATTENDING" || status === "DECLINED"
      ? status
      : "PENDING") as AttendeeStatus;
    const next = people.map((p) => ({ ...p, church: said, reception: said }));
    setForm((f) => ({ ...f, attendees: next, status }));
  }

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
      // What is on screen is what is saved. A person who was added but never
      // named is not on the invitation, and does not hold a seat either.
      const named = people
        .filter((p) => p.name.trim().length > 0)
        .map((p, position) => ({ ...p, position }));
      const blanks = people.length - named.length;
      const ok = await onSave(
        {
          ...form,
          attendees: named,
          maxGuests: Math.max(named.length, form.maxGuests - blanks, 1),
        },
        answersChanged
      );
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
                // The line is still the quickest way to write a household: the
                // people below it follow along as it is typed.
                setNames(splitGuestNames(name));
                setForm((f) => ({
                  ...f,
                  name,
                  // "and", "og", "e" and a comma each name another person, and
                  // each of them answers for themselves — so the invitation
                  // grows a seat rather than leaving somebody unable to reply.
                  maxGuests: Math.max(f.maxGuests, Math.min(countGuestNames(name), 10)),
                  // A new household gets a code proposed as you type, until
                  // somebody types their own; an existing one keeps the code its
                  // guests already have in their pocket.
                  guestCode: codeFor(f, name),
                }));
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
              onChange={(e) => answerForEveryone(e.target.value)}
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

        {/*
          The household's numbers are read off these answers, so this is where a
          single person is corrected: one of them can come to the church while
          the other cannot, and either can be left unanswered. It is also where
          an invitation grows: a name typed here is added to the line above.
        */}
        {people.length > 0 && (
          <section className="mt-5 border-t-4 border-black pt-4">
            <h3 className="text-[14px] flex items-center gap-2">
              <Icon name="guests" className="h-4 w-4" />
              {t.whoIsComing}
            </h3>
            <p className="text-[12px] opacity-60 mt-1">{t.answerHint}</p>
            <ul className="flex flex-col gap-2 mt-3">
              {people.map((person) => (
                <li
                  key={person.position}
                  className="flex flex-wrap items-start gap-2 text-[13px]"
                >
                  <div className="flex items-center gap-1 w-full sm:w-[9rem] sm:shrink-0">
                    <input
                      value={person.name}
                      onChange={(e) =>
                        changePeople(
                          names.map((n, i) => (i === person.position ? e.target.value : n))
                        )
                      }
                      placeholder={t.personNamePlaceholder}
                      aria-label={t.personName}
                      className="border-2 border-black p-1 text-[13px] w-full min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => removePerson(person.position)}
                      title={t.removePerson(person.name || t.personName)}
                      aria-label={t.removePerson(person.name || t.personName)}
                      className="pixel-btn border-2 border-black bg-pastel-pink px-1.5 py-1 shrink-0"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Every answer starts at the same left edge, so a row reads
                      as "this person" on the left and "these choices" on the
                      right however far the names wrap. */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[12rem]">
                    {(
                      [
                        ["church", t.atChurch, person.church],
                        ["reception", t.atReception, person.reception],
                      ] as const
                    ).map(([part, label, said]) => (
                      <AnswerButtons
                        key={part}
                        said={said}
                        label={label}
                        attendingText={t.personAttending}
                        declinedText={t.personDeclined}
                        pendingText={t.personPending}
                        title={t.answerFor(person.name)}
                        onAnswer={(next: AttendeeStatus) =>
                          editPerson(person.position, { [part]: next })
                        }
                      />
                    ))}
                    {person.reception === "ATTENDING" && (
                      <input
                        value={person.allergies}
                        onChange={(e) =>
                          editPerson(person.position, { allergies: e.target.value })
                        }
                        placeholder={t.allergyPlaceholder}
                        aria-label={`${t.allergies} — ${person.name}`}
                        className="border-2 border-black p-1 text-[13px] flex-1 min-w-[8rem]"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => changePeople([...names, ""])}
              className="pixel-btn bg-pastel-blue border-2 border-black py-1.5 px-3 text-[13px] flex items-center gap-2 mt-3"
            >
              <Icon name="addGuest" className="h-4 w-4" /> {t.addPerson}
            </button>
          </section>
        )}

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

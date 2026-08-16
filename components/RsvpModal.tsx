"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT } from "@/lib/config";
import { OscarSays } from "@/components/Oscar";
import Icon from "@/components/Icon";
import Leaderboard from "@/components/Leaderboard";
import BoneRace from "@/components/BoneRace";
import { DICTS, type Lang } from "@/lib/i18n";
import { formatNameList } from "@/lib/names";
import {
  attendeeSlots,
  attending as attendingTo,
  partyFromAttendees,
  MAX_ALLERGY_LENGTH,
  type AttendeeSlot,
  type Part,
} from "@/lib/attendees";

type Guest = {
  guestCode: string;
  name: string;
  status: string;
  /** The church and the party are answered separately, so both are counted. */
  churchCount?: number;
  churchKids?: number;
  guestCount: number;
  kids: number;
  kidsAllergies?: string;
  /** How many adults and children this invitation covers. */
  maxGuests: number;
  maxKids: number;
};

export type RunResult = {
  bones: number;
  blessings: number;
  finished: boolean;
  score: number;
  isBest: boolean;
};

type Props = {
  guest: Guest | null;
  /** Whatever each person on the invitation has already answered. */
  attendees?: AttendeeSlot[] | null;
  /** Demo invitation — the flow behaves normally but nothing is stored. */
  demo?: boolean;
  lang: Lang;
  run?: RunResult | null;
  leaderboardKey?: number;
  onClose: () => void;
  onSaved?: (guest: Guest, attendees: AttendeeSlot[]) => void;
};

/**
 * The reply is given in short steps. The day is two invitations — the
 * christening and the party afterwards — so each is answered on its own screen.
 */
type Step = "congrats" | "invitation" | "church" | "reception";

/**
 * One collapsible allergy note. It opens by itself once there is something in
 * it, so a note already given is never hidden behind a closed panel.
 *
 * Deliberately declared outside the modal: a component defined inside another
 * is a new type on every render, and the textarea would lose focus after every
 * single keystroke.
 */
function AllergyAccordion({
  id,
  title,
  value,
  expanded,
  placeholder,
  emptyLabel,
  onToggle,
  onChange,
}: {
  id: string;
  title: string;
  value: string;
  expanded: boolean;
  placeholder: string;
  emptyLabel: string;
  onToggle: () => void;
  onChange: (next: string) => void;
}) {
  return (
    <div className="border-2 border-black bg-pastel-cream">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[13px]"
      >
        <span className="flex items-center gap-2">
          <Icon name="warning" className="h-4 w-4 shrink-0 text-amber-700" />
          <span>{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {!expanded && (
            <span className="max-w-[9rem] truncate opacity-75">
              {value.trim() || emptyLabel}
            </span>
          )}
          <Icon name={expanded ? "up" : "down"} className="h-4 w-4 shrink-0" />
        </span>
      </button>
      {expanded && (
        <div id={`${id}-panel`} className="border-t-2 border-black/20 p-3">
          <textarea
            value={value}
            maxLength={MAX_ALLERGY_LENGTH}
            rows={2}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full resize-none border-2 border-black bg-white p-2 text-[13px] leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}

export default function RsvpModal({
  guest,
  attendees,
  demo = false,
  lang,
  run,
  leaderboardKey = 0,
  onClose,
  onSaved,
}: Props) {
  const t = DICTS[lang];
  // An invitation is for a fixed household: the people are the names on it, and
  // nobody is asked about children they are not invited to bring.
  const maxKids = Math.max(0, guest?.maxKids ?? 0);
  const [people, setPeople] = useState<AttendeeSlot[]>(() =>
    guest ? attendeeSlots(guest, attendees ?? []) : []
  );
  const [churchKids, setChurchKids] = useState(
    Math.min(Math.max(guest?.churchKids ?? 0, 0), maxKids)
  );
  const [kids, setKids] = useState(Math.min(Math.max(guest?.kids ?? 0, 0), maxKids));
  const [kidsAllergies, setKidsAllergies] = useState(guest?.kidsAllergies ?? "");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  // An answer already stored for this guest is shown straight away, so
  // re-opening the RSVP never looks like the reply was lost.
  const [result, setResult] = useState<null | "ATTENDING" | "DECLINED">(
    guest?.status === "ATTENDING" || guest?.status === "DECLINED" ? guest.status : null
  );
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("congrats");
  // The reply is what this screen is for, so it opens on the reply and the
  // standings sit one tap away rather than between the guest and the buttons.
  const [tab, setTab] = useState<"rsvp" | "race">("rsvp");
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab, step, result]);

  const steps: Step[] = ["congrats", "invitation", "church", "reception"];
  const stepIndex = steps.indexOf(step);

  const name = guest?.name ?? "Friend";
  const everyoneAnswered =
    people.length > 0 &&
    people.every((p) => p.church !== "PENDING" && p.reception !== "PENDING");
  const party = useMemo(
    () => partyFromAttendees(people, { church: churchKids, reception: kids }),
    [people, churchKids, kids]
  );

  const ceremonyTime =
    lang === "en"
      ? EVENT.ceremonyTimeEn
      : lang === "pt"
        ? EVENT.ceremonyTimePt
        : EVENT.ceremonyTime;
  const receptionTime =
    lang === "en"
      ? EVENT.receptionTimeEn
      : lang === "pt"
        ? EVENT.receptionTimePt
        : EVENT.receptionTime;

  function answer(position: number, part: Part, coming: boolean) {
    setError(null);
    setPeople((list) =>
      list.map((p) =>
        p.position === position
          ? {
              ...p,
              [part]: coming ? "ATTENDING" : "DECLINED",
              // The food is at the party, so an empty seat there carries no note.
              allergies: part === "reception" && !coming ? "" : p.allergies,
            }
          : p
      )
    );
    if (part === "reception" && !coming) {
      setOpen((o) => ({ ...o, [`p${position}`]: false }));
    }
  }

  /** Open when asked, or by itself once the note has something in it. */
  const isOpen = (id: string, value: string) => open[id] ?? value.trim().length > 0;
  const toggle = (id: string, value: string) =>
    setOpen((o) => ({ ...o, [id]: !isOpen(id, value) }));

  function setAllergies(position: number, value: string) {
    setPeople((list) =>
      list.map((p) =>
        p.position === position ? { ...p, allergies: value.slice(0, MAX_ALLERGY_LENGTH) } : p
      )
    );
  }

  async function submit() {
    if (!guest) return;
    if (!everyoneAnswered) {
      setError(t.answerEveryone);
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      guestCode: guest.guestCode,
      attendees: people.map((p) => ({
        position: p.position,
        church: p.church === "ATTENDING",
        reception: p.reception === "ATTENDING",
        allergies: p.allergies,
      })),
      churchKids: party.churchKids,
      kids: party.kids,
      kidsAllergies: party.kids > 0 ? kidsAllergies : "",
    };
    const saved: Guest = {
      ...guest,
      status: party.status === "ATTENDING" ? "ATTENDING" : "DECLINED",
      churchCount: party.churchCount,
      churchKids: party.churchKids,
      guestCount: party.guestCount,
      kids: party.kids,
      kidsAllergies: payload.kidsAllergies,
    };

    // A demo reply is acknowledged exactly like a real one, minus the write.
    if (demo) {
      await new Promise((r) => setTimeout(r, 350));
      setResult(saved.status as "ATTENDING" | "DECLINED");
      onSaved?.(saved, people);
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || t.genericError);
      }
      setResult(saved.status as "ATTENDING" | "DECLINED");
      onSaved?.(saved, people);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        ref={bodyRef}
        className="pixel-border relative w-full max-w-md bg-pastel-cream border-4 border-black p-5 sm:p-7 max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label={t.close}
          className="pixel-btn sticky top-0 float-right z-10 w-9 h-9 -mt-1 -mr-1 bg-pastel-pink border-4 border-black text-black text-sm"
        >
          <Icon name="close" />
        </button>

        <div className="text-black">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 text-2xl mb-3">
              <Icon name="baby" className="text-[#d98ba5]" />
              <Icon name="cross" className="text-pastel-plum" />
            </div>
            <h1 className="text-[21px] sm:text-[24px] leading-relaxed">
              {t.rsvpWelcome(name)}
            </h1>
            <p className="text-[14px] sm:text-[16px] mt-3 text-pastel-plum">
              {t.invitedTo}
            </p>
          </div>

          <div role="tablist" className="flex gap-2 mb-6">
            {([
              ["rsvp", t.tabRsvp, "mail"],
              ["race", t.tabCompetition, "trophy"],
            ] as const).map(([id, label, icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`pixel-btn flex-1 border-4 border-black py-2.5 px-3 text-[14px] flex items-center justify-center gap-2 ${
                  tab === id ? "bg-pastel-green" : "bg-white"
                }`}
              >
                <Icon name={icon} /> {label}
              </button>
            ))}
          </div>

          {tab === "race" ? (
            <div className="space-y-4">
              <BoneRace
                lang={lang}
                highlightCode={guest?.guestCode}
                refreshKey={leaderboardKey}
              />
              <Leaderboard
                lang={lang}
                highlightCode={guest?.guestCode}
                refreshKey={leaderboardKey}
              />
            </div>
          ) : !result ? (
          <div className="flex flex-col gap-6">
            {/* The reply is a wizard too: celebrate, read the invitation, answer. */}
            <div
              className="flex items-center justify-center gap-2.5"
              role="status"
              aria-label={t.stepOf(stepIndex + 1, steps.length)}
            >
              {steps.map((s, i) => (
                <span
                  key={s}
                  aria-hidden
                  className={`h-2 w-2 border-2 border-black ${
                    i === stepIndex ? "bg-pastel-purple" : i < stepIndex ? "bg-black" : "bg-white"
                  }`}
                />
              ))}
            </div>

            {demo && (
              <p className="bg-pastel-purple text-black border-4 border-black px-3 py-2.5 text-[13px] leading-relaxed flex items-center gap-2.5">
                <Icon name="warning" className="h-4 w-4 shrink-0" /> {t.demoNotice}
              </p>
            )}

            {step === "congrats" && (
              <section className="flex flex-col gap-4 text-center">
                <div className="text-4xl">
                  <Icon
                    name={run?.finished ? "celebrate" : "star"}
                    className="mx-auto text-amber-600"
                  />
                </div>
                <h2 className="text-[19px] leading-relaxed">
                  {run?.finished ? t.congratsTitle : t.thanks}
                </h2>
                <p className="text-[14px] leading-relaxed">
                  {run?.finished ? t.congratsBody : t.congratsPartial}
                </p>

                {run && (
                  <div className="bg-white border-4 border-black p-4 text-left text-[14px] leading-relaxed">
                    <div className="flex items-center gap-2 font-bold mb-2">
                      <Icon name="star" className="h-4 w-4 shrink-0 text-amber-600" />
                      {t.yourScore}: <span className="text-pastel-plum">{run.score}</span>{" "}
                      {t.points}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                      <span className="flex items-center gap-1.5">
                        <Icon name="bone" className="h-4 w-4 shrink-0" /> {t.bonesCollected}:{" "}
                        {run.bones}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Icon name="cross" className="h-4 w-4 shrink-0 text-pastel-plum" />{" "}
                        {t.blessingsFound}: {run.blessings}/3
                      </span>
                    </div>
                    {run.isBest && (
                      <p className="mt-2 flex items-center gap-2 text-green-700">
                        <Icon name="trophy" className="h-4 w-4 shrink-0" /> {t.newRecord}
                      </p>
                    )}
                  </div>
                )}

                <OscarSays>{t.oscarChurch}</OscarSays>
              </section>
            )}

            {step === "invitation" && (
              <section className="flex flex-col gap-4">
                <h2 className="text-[15px] leading-relaxed text-center">{t.stepInvitation}</h2>
                <div className="bg-white border-4 border-black p-4 text-[14px] sm:text-[16px] leading-relaxed space-y-3">
                  <p className="flex items-start gap-2">
                    <Icon name="baby" className="mt-0.5 h-4 w-4 shrink-0 text-pastel-plum" />
                    <span>
                      <span className="text-pastel-plum">{t.child}:</span> {EVENT.child}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Icon name="cake" className="mt-0.5 h-4 w-4 shrink-0 text-pastel-plum" />
                    <span>
                      <span className="text-pastel-plum">{t.birthday}:</span> {EVENT.birthday}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Icon name="mother" className="mt-0.5 h-4 w-4 shrink-0 text-pastel-plum" />
                    <span>
                      <span className="text-pastel-plum">{t.mother}:</span> {EVENT.mother}
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Icon name="father" className="mt-0.5 h-4 w-4 shrink-0 text-pastel-plum" />
                    <span>
                      <span className="text-pastel-plum">{t.father}:</span> {EVENT.father}
                    </span>
                  </p>
                  <hr className="border-black/20 !my-4" />
                  <p className="flex items-start gap-2">
                    <Icon name="church" className="mt-0.5 h-4 w-4 shrink-0 text-pastel-plum" />
                    <span>
                      <span className="text-pastel-plum">{t.ceremony}:</span> {ceremonyTime}
                      <br />
                      <span className="opacity-70">{EVENT.ceremonyPlace}</span>
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Icon name="celebrate" className="mt-0.5 h-4 w-4 shrink-0 text-pastel-plum" />
                    <span>
                      <span className="text-pastel-plum">{t.reception}:</span> {receptionTime}
                      <br />
                      <span className="opacity-70">{EVENT.receptionPlace}</span>
                    </span>
                  </p>
                </div>
              </section>
            )}

            {(step === "church" || step === "reception") && (
              <section className="flex flex-col gap-4">
                <div className="text-center">
                  <h2 className="text-[15px] leading-relaxed flex items-center justify-center gap-2">
                    <Icon
                      name={step === "church" ? "church" : "celebrate"}
                      className="h-4 w-4 shrink-0 text-pastel-plum"
                    />
                    {step === "church" ? t.partChurch : t.partReception}
                  </h2>
                  <p className="text-[12px] opacity-75 mt-1.5 leading-relaxed">
                    {step === "church" ? t.churchHint : t.receptionHint}
                  </p>
                  <p className="text-[12px] opacity-75 mt-2 leading-relaxed">
                    {step === "church" ? ceremonyTime : receptionTime}
                    <br />
                    {step === "church" ? EVENT.ceremonyPlace : EVENT.receptionPlace}
                  </p>
                </div>

                {/* One invitation, one answer per person, for this half of the day. */}
                <ul className="flex flex-col gap-3">
                  {people.map((person) => {
                    const said = person[step];
                    return (
                      <li
                        key={person.position}
                        className="border-4 border-black bg-white p-3 flex flex-col gap-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          <span className="text-[15px] break-words">{person.name}</span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              aria-pressed={said === "ATTENDING"}
                              onClick={() => answer(person.position, step, true)}
                              className={`pixel-btn flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-[13px] ${
                                said === "ATTENDING" ? "bg-pastel-green" : "bg-white opacity-70"
                              }`}
                            >
                              <Icon name="check" className="h-4 w-4 shrink-0" />
                              {t.comingYes}
                            </button>
                            <button
                              type="button"
                              aria-pressed={said === "DECLINED"}
                              onClick={() => answer(person.position, step, false)}
                              className={`pixel-btn flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-[13px] ${
                                said === "DECLINED" ? "bg-pastel-pink" : "bg-white opacity-70"
                              }`}
                            >
                              <Icon name="close" className="h-4 w-4 shrink-0" />
                              {t.comingNo}
                            </button>
                          </span>
                        </div>
                        {/* Allergies are asked where the food is served. */}
                        {step === "reception" && said === "ATTENDING" && (
                          <AllergyAccordion
                            id={`p${person.position}`}
                            title={t.allergiesTitle}
                            value={person.allergies}
                            expanded={isOpen(`p${person.position}`, person.allergies)}
                            placeholder={t.allergiesPlaceholder}
                            emptyLabel={t.allergiesAdd}
                            onToggle={() => toggle(`p${person.position}`, person.allergies)}
                            onChange={(v) => setAllergies(person.position, v)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {maxKids > 0 ? (
                  <div className="border-4 border-black bg-white p-3 flex flex-col gap-3">
                    <label className="block text-[14px]">
                      <Icon name="child" className="icon-inline mr-1.5" />
                      {t.kidsCount}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: maxKids + 1 }, (_, i) => i).map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={(step === "church" ? churchKids : kids) === n}
                          onClick={() => (step === "church" ? setChurchKids(n) : setKids(n))}
                          className={`pixel-btn w-11 h-11 border-4 border-black text-[17px] ${
                            (step === "church" ? churchKids : kids) === n
                              ? "bg-pastel-green"
                              : "bg-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-[12px] opacity-75 -mt-1 leading-relaxed">{t.maxKidsNote(maxKids)}</p>
                    {/* Babies are not catered for, so they are not counted either. */}
                    <p className="text-[12px] flex items-start gap-2 leading-relaxed text-pastel-plum">
                      <Icon name="warning" className="mt-0.5 h-4 w-4 shrink-0" />
                      {t.kidsUnderOne}
                    </p>
                    {step === "reception" && kids > 0 && (
                      <AllergyAccordion
                        id="kids"
                        title={t.kidsAllergiesTitle}
                        value={kidsAllergies}
                        expanded={isOpen("kids", kidsAllergies)}
                        placeholder={t.allergiesPlaceholder}
                        emptyLabel={t.allergiesAdd}
                        onToggle={() => toggle("kids", kidsAllergies)}
                        onChange={setKidsAllergies}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] opacity-70 flex items-start gap-2">
                    <Icon name="child" className="mt-0.5 h-4 w-4 shrink-0" /> {t.noKidsNote}
                  </p>
                )}

                {error && (
                  <p className="text-red-600 text-[14px] break-words flex items-center gap-2">
                    <Icon name="warning" className="h-4 w-4 shrink-0" /> {error}
                  </p>
                )}
              </section>
            )}

            <div className="flex flex-col gap-3 pt-1">
              {step === "reception" ? (
                <button
                  disabled={submitting}
                  onClick={submit}
                  className="pixel-btn bg-pastel-green border-4 border-black py-3 text-[16px] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Icon name="spinner" spin className="h-5 w-5 shrink-0" /> {t.sending}
                    </>
                  ) : (
                    <>
                      <Icon name="sent" className="h-5 w-5 shrink-0" /> {t.sendReply}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setStep(steps[stepIndex + 1]!)}
                  className="pixel-btn bg-pastel-green border-4 border-black py-3 text-[16px] flex items-center justify-center gap-2"
                >
                  <Icon name="right" className="h-5 w-5 shrink-0" /> {t.next}
                </button>
              )}
              {stepIndex > 0 && (
                <button
                  onClick={() => setStep(steps[stepIndex - 1]!)}
                  className="pixel-btn self-start border-2 border-black bg-white px-3 py-2 text-[13px] flex items-center gap-1"
                >
                  <Icon name="left" className="h-4 w-4 shrink-0" /> {t.back}
                </button>
              )}
            </div>
          </div>
          ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">
              <Icon
                name={result === "ATTENDING" ? "celebrate" : "mail"}
                className={`mx-auto ${
                  result === "ATTENDING" ? "text-amber-600" : "text-pastel-plum"
                }`}
              />
            </div>
            <h2 className="text-[19px] sm:text-[21px] leading-relaxed mb-3">
              {result === "ATTENDING" ? t.thanks : t.willMiss}
            </h2>
            <p className="text-[14px] sm:text-[16px] leading-relaxed">
              {result === "ATTENDING"
                ? t.thanksBody(party.guestCount, party.kids)
                : t.declinedBody}
            </p>
            {/* Both halves of the day, by name, so a split reply is unmistakable. */}
            {result === "ATTENDING" && (
              <div className="mt-5 flex flex-col gap-3 text-left text-[13px] leading-relaxed">
                {([
                  ["church", t.partChurch, "church", party.churchCount, party.churchKids],
                  ["reception", t.partReception, "celebrate", party.guestCount, party.kids],
                ] as const).map(([part, label, icon, adults, littleOnes]) => {
                  const coming = attendingTo(people, part);
                  return (
                    <div key={part} className="border-2 border-black bg-white p-3">
                      <p className="flex items-center gap-2">
                        <Icon name={icon} className="h-4 w-4 shrink-0 text-pastel-plum" />
                        <span>{label}</span>
                      </p>
                      <p className={`mt-1.5 ${coming.length > 0 ? "text-green-700" : "opacity-70"}`}>
                        {coming.length > 0
                          ? `${formatNameList(coming.map((p) => p.name), lang)} · ${t.comingCount(adults, littleOnes)}`
                          : t.nobodyComing}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            {demo && (
              <p className="mt-3 text-[13px] leading-relaxed text-pastel-plum">
                {t.demoNotice}
              </p>
            )}
            <button
              onClick={() => {
                setResult(null);
                setStep("church");
              }}
              className="pixel-btn mt-5 mr-2 bg-pastel-green border-4 border-black py-2 px-4 text-[16px] inline-flex items-center gap-2"
            >
              <Icon name="edit" className="h-4 w-4 shrink-0" /> {t.changeReply}
            </button>
            <button
              onClick={onClose}
              className="pixel-btn mt-5 bg-pastel-blue border-4 border-black py-2 px-4 text-[16px] inline-flex items-center gap-2"
            >
              <Icon name="close" className="h-4 w-4 shrink-0" /> {t.close}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

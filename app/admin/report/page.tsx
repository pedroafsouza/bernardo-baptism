"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import AnswerButtons from "@/components/admin/AnswerButtons";
import { fetchGuests, saveAnswers, type AdminGuest } from "@/lib/adminGuests";
import {
  ADMIN_LANGS,
  ADMIN_LANG_LABEL,
  useAdminLang,
  type AdminDict,
} from "@/lib/adminI18n";
import { attending, summarizeAllergies, type AttendeeSlot } from "@/lib/attendees";
import { clampParty, headcount } from "@/lib/capacity";
import { EVENT } from "@/lib/config";

type Screen = "loading" | "ready" | "denied" | "error";

/** A household belongs on the report when anybody on it is coming to anything. */
function isComing(guest: AdminGuest): boolean {
  return (guest.attendees ?? []).some(
    (p) => p.church === "ATTENDING" || p.reception === "ATTENDING"
  );
}

function ReportInner() {
  const { lang, setLang, t } = useAdminLang();
  const locale = lang === "en" ? "en-GB" : "da-DK";

  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [screen, setScreen] = useState<Screen>("loading");
  const [error, setError] = useState<string | null>(null);
  // The report answers "who is coming", so it opens on exactly that. Everybody
  // else is one click away, because a correction usually means moving somebody
  // onto the list rather than off it.
  const [onlyComing, setOnlyComing] = useState(true);

  const load = useCallback(async () => {
    const result = await fetchGuests();
    if (!result.ok) {
      setScreen(result.reason === "FAILED" ? "error" : "denied");
      return;
    }
    setGuests(result.guests);
    setScreen("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Answers one half of the day for one person and leaves everybody else on the
   * invitation exactly as they were — the whole point of the page: one person
   * comes, the next one in the same household does not.
   */
  async function answer(
    guest: AdminGuest,
    position: number,
    part: "church" | "reception",
    said: string
  ) {
    const people = (guest.attendees ?? []).map((p) =>
      p.position === position
        ? {
            ...p,
            [part]: said,
            allergies: part === "reception" && said !== "ATTENDING" ? "" : p.allergies,
          }
        : p
    );

    // Show the answer at once; the server has the last word on the head counts.
    setGuests((prev) =>
      prev.map((x) => (x.id === guest.id ? { ...x, attendees: people } : x))
    );

    const saved = await saveAnswers(guest, people);
    if (!saved) {
      setError(t.couldNotSave);
      await load();
      return;
    }
    setError(null);
    setGuests((prev) =>
      prev.map((x) =>
        x.id === guest.id ? { ...x, ...saved.guest, attendees: saved.attendees } : x
      )
    );
  }

  const shown = useMemo(() => {
    const list = onlyComing ? guests.filter(isComing) : guests;
    return [...list].sort(
      (a, b) =>
        a.group.localeCompare(b.group, locale) || a.name.localeCompare(b.name, locale)
    );
  }, [guests, onlyComing, locale]);

  const totals = useMemo(() => {
    const party = headcount(guests);
    const church = guests.reduce(
      (sum, g) => {
        if (g.status !== "ATTENDING") return sum;
        const fits = clampParty({ guestCount: g.churchCount, kids: g.churchKids }, g);
        return { adults: sum.adults + fits.guestCount, kids: sum.kids + fits.kids };
      },
      { adults: 0, kids: 0 }
    );
    return { party, church };
  }, [guests]);

  if (screen === "loading") {
    return (
      <main className="min-h-screen p-6 bg-pastel-cream text-black">
        <p className="text-[15px] animate-pulse">{t.loading}</p>
      </main>
    );
  }

  if (screen === "denied" || screen === "error") {
    return (
      <main className="min-h-screen p-6 bg-pastel-cream text-black">
        <div className="pixel-border bg-white border-4 border-black p-4 max-w-md">
          <p className="text-[15px] mb-3">
            {screen === "denied" ? t.adminLogin : t.couldNotLoad}
          </p>
          <Link
            href="/admin"
            className="pixel-btn inline-flex items-center gap-2 bg-pastel-green border-4 border-black py-2 px-3 text-[14px]"
          >
            <Icon name="left" /> {t.backToPanel}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-pastel-cream text-black print:p-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2 print:hidden">
          <h1 className="text-[21px] sm:text-[24px] flex items-center gap-2">
            <Icon name="guests" /> {t.reportTitle}
          </h1>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-1.5 text-[14px]" title={t.language}>
              <Icon name="language" className="opacity-60" />
              {ADMIN_LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`pixel-btn border-2 border-black px-2 py-1 ${
                    lang === l ? "bg-pastel-green" : "bg-white opacity-70"
                  }`}
                >
                  {ADMIN_LANG_LABEL[l]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="pixel-btn bg-pastel-blue border-4 border-black py-2 px-3 text-[14px] flex items-center gap-2"
            >
              <Icon name="print" /> {t.print}
            </button>
            <Link
              href="/admin"
              className="pixel-btn bg-white border-4 border-black py-2 px-3 text-[14px] flex items-center gap-2"
            >
              <Icon name="left" /> {t.backToPanel}
            </Link>
          </div>
        </div>

        {/* On paper the page needs a heading of its own, the screen's being hidden. */}
        <div className="hidden print:block mb-3">
          <h1 className="text-[20px]">
            {t.reportTitle} — {EVENT.child}
          </h1>
          <p className="text-[12px]">
            {t.printedOn(new Date().toLocaleDateString(locale))}
          </p>
        </div>

        {error && (
          <div className="pixel-border bg-pastel-pink border-4 border-black p-3 mb-4 text-[14px] print:hidden">
            {error}
          </div>
        )}

        <div className="pixel-border bg-pastel-green border-4 border-black p-4 mb-4 flex flex-wrap gap-6 print-keep">
          <div>
            <div className="text-[14px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="church" /> {t.atChurch}
            </div>
            <div className="text-xl">{totals.church.adults + totals.church.kids}</div>
            <div className="text-[13px] opacity-70 mt-1">
              {t.adultsKids(totals.church.adults, totals.church.kids)}
            </div>
          </div>
          <div>
            <div className="text-[14px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="celebrate" /> {t.atReception}
            </div>
            <div className="text-xl">{totals.party.total}</div>
            <div className="text-[13px] opacity-70 mt-1">
              {t.adultsKids(totals.party.adults, totals.party.kids)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 text-[14px] print:hidden">
          <span className="opacity-70">{t.reportIntro}</span>
          <button
            type="button"
            onClick={() => setOnlyComing((v) => !v)}
            aria-pressed={onlyComing}
            className={`pixel-btn border-2 border-black px-2 py-1 ml-auto shrink-0 ${
              onlyComing ? "bg-pastel-green" : "bg-white opacity-70"
            }`}
          >
            {onlyComing ? t.onlyComing : t.everyone}
          </button>
        </div>

        {shown.length === 0 ? (
          <p className="text-[15px]">{onlyComing ? t.nobodyComing : t.noGuestsMatch}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((g) => (
              <Household key={g.id} guest={g} t={t} onAnswer={answer} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Household({
  guest,
  t,
  onAnswer,
}: {
  guest: AdminGuest;
  t: AdminDict;
  onAnswer: (
    guest: AdminGuest,
    position: number,
    part: "church" | "reception",
    said: string
  ) => void;
}) {
  const people: AttendeeSlot[] = guest.attendees ?? [];
  const kidsAtChurch = clampParty({ guestCount: 0, kids: guest.churchKids }, guest).kids;
  const kidsAtParty = clampParty({ guestCount: 0, kids: guest.kids }, guest).kids;
  const eating = attending(people, "reception").length > 0;

  return (
    <li className="pixel-border bg-white border-4 border-black p-3 print-keep">
      <div className="flex flex-wrap items-baseline gap-2 mb-2">
        <span className="text-[16px] font-bold">{guest.name}</span>
        <span className="text-[13px] opacity-70">{guest.group}</span>
        <span className="text-[13px] opacity-70">{guest.guestCode}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {people.map((person) => (
          <li
            key={person.position}
            className="flex flex-wrap items-center gap-2 text-[13px]"
          >
            <span className="min-w-[8rem] font-bold">{person.name}</span>
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
                onAnswer={(next) => onAnswer(guest, person.position, part, next)}
              />
            ))}
            {person.reception === "ATTENDING" && person.allergies.trim().length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Icon name="warning" className="h-4 w-4 shrink-0 text-yellow-700" />
                {person.allergies}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Children are counted, not named, so they are one line under the adults. */}
      {(kidsAtChurch > 0 || kidsAtParty > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="inline-flex items-center gap-1">
            <Icon name="child" className="h-4 w-4 shrink-0" />
            {t.kidsAllergies}
          </span>
          {kidsAtChurch > 0 && (
            <span>
              {t.kidsAtChurch}: {kidsAtChurch}
            </span>
          )}
          {kidsAtParty > 0 && (
            <span>
              {t.kidsAtParty}: {kidsAtParty}
            </span>
          )}
          {guest.kidsAllergies.trim().length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="warning" className="h-4 w-4 shrink-0 text-yellow-700" />
              {guest.kidsAllergies}
            </span>
          )}
        </div>
      )}

      {/* The kitchen needs to know that nothing was declared, not just to see nothing. */}
      {eating && summarizeAllergies(people, guest.kidsAllergies ?? "").length === 0 && (
        <div className="mt-2 text-[13px] opacity-70">{t.noAllergies}</div>
      )}
    </li>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-6 bg-pastel-cream text-black">
          <p className="text-[15px] animate-pulse">…</p>
        </main>
      }
    >
      <ReportInner />
    </Suspense>
  );
}

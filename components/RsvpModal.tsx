"use client";

import { useState } from "react";
import { EVENT } from "@/lib/config";
import { OscarSays } from "@/components/Oscar";
import Icon from "@/components/Icon";
import Leaderboard from "@/components/Leaderboard";
import BoneRace from "@/components/BoneRace";
import { DICTS, type Lang } from "@/lib/i18n";

type Guest = {
  guestCode: string;
  name: string;
  status: string;
  guestCount: number;
  kids: number;
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
  /** Demo invitation — the flow behaves normally but nothing is stored. */
  demo?: boolean;
  lang: Lang;
  run?: RunResult | null;
  leaderboardKey?: number;
  onClose: () => void;
  onSaved?: (guest: Guest) => void;
};

export default function RsvpModal({
  guest,
  demo = false,
  lang,
  run,
  leaderboardKey = 0,
  onClose,
  onSaved,
}: Props) {
  const t = DICTS[lang];
  // An invitation is for a fixed number of people, so the picker only ever
  // offers what the household was actually invited to bring. Nobody is asked
  // about children they are not invited to bring — the row is simply absent.
  const maxGuests = Math.max(1, guest?.maxGuests ?? 1);
  const maxKids = Math.max(0, guest?.maxKids ?? 0);
  const [count, setCount] = useState(
    Math.min(guest?.guestCount && guest.guestCount > 0 ? guest.guestCount : 1, maxGuests)
  );
  const [kids, setKids] = useState(Math.min(Math.max(guest?.kids ?? 0, 0), maxKids));
  const [submitting, setSubmitting] = useState(false);
  // An answer already stored for this guest is shown straight away, so
  // re-opening the RSVP never looks like the reply was lost.
  const [result, setResult] = useState<null | "ATTENDING" | "DECLINED">(
    guest?.status === "ATTENDING" || guest?.status === "DECLINED" ? guest.status : null
  );
  const [error, setError] = useState<string | null>(null);

  const name = guest?.name ?? "Friend";
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

  async function submit(status: "ATTENDING" | "DECLINED") {
    if (!guest) return;
    setSubmitting(true);
    setError(null);
    // A demo reply is acknowledged exactly like a real one, minus the write.
    if (demo) {
      await new Promise((r) => setTimeout(r, 350));
      setResult(status);
      onSaved?.({
        ...guest,
        status,
        guestCount: status === "ATTENDING" ? count : 0,
      });
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestCode: guest.guestCode,
          status,
          guestCount: status === "ATTENDING" ? count : 0,
          kids: status === "ATTENDING" ? kids : 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || t.genericError);
      }
      setResult(status);
      onSaved?.({
        ...guest,
        status,
        guestCount: status === "ATTENDING" ? count : 0,
        kids: status === "ATTENDING" ? kids : 0,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="pixel-border relative w-full max-w-md bg-pastel-cream border-4 border-black p-5 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label={t.close}
          className="pixel-btn sticky top-0 float-right z-10 w-9 h-9 -mt-1 -mr-1 bg-pastel-pink border-4 border-black text-black text-sm"
        >
          <Icon name="close" />
        </button>

        {!result ? (
          <div className="text-black">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-3 text-2xl mb-2">
                <Icon name="baby" className="text-[#d98ba5]" />
                <Icon name="cross" className="text-pastel-purple" />
              </div>
              <h1 className="text-[21px] sm:text-[24px] leading-relaxed">
                {t.rsvpWelcome(name)}
              </h1>
              <p className="text-[14px] sm:text-[16px] mt-2 text-pastel-purple">
                {t.invitedTo}
              </p>
            </div>

            {/* Run summary — only after actually playing to the church */}
            {run && (
              <div className="bg-white border-4 border-black p-3 mb-4 text-[14px] leading-relaxed">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <Icon name="star" className="text-yellow-500" />
                  {t.yourScore}: <span className="text-pastel-purple">{run.score}</span>{" "}
                  {t.points}
                </div>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5">
                    <Icon name="bone" /> {t.bonesCollected}: {run.bones}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon name="cross" className="text-pastel-purple" />{" "}
                    {t.blessingsFound}: {run.blessings}/3
                  </span>
                </div>
                {run.isBest && (
                  <p className="mt-2 flex items-center gap-2 text-green-700">
                    <Icon name="trophy" /> {t.newRecord}
                  </p>
                )}
              </div>
            )}

            <div className="mb-4">
              <Leaderboard
                lang={lang}
                highlightCode={guest?.guestCode}
                refreshKey={leaderboardKey}
              />
            </div>

            <div className="mb-4">
              <BoneRace
                lang={lang}
                highlightCode={guest?.guestCode}
                refreshKey={leaderboardKey}
              />
            </div>

            {demo && (
              <p className="bg-pastel-purple text-white border-4 border-black p-2 mb-4 text-[13px] leading-relaxed flex items-center gap-2">
                <Icon name="warning" /> {t.demoNotice}
              </p>
            )}

            <div className="mb-4">
              <OscarSays>{t.oscarChurch}</OscarSays>
            </div>

            <div className="bg-white border-4 border-black p-3 text-[14px] sm:text-[16px] leading-relaxed space-y-2 mb-4">
              <p className="flex items-start gap-2">
                <Icon name="baby" className="mt-0.5 text-pastel-purple" />
                <span>
                  <span className="text-pastel-purple">{t.child}:</span> {EVENT.child}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Icon name="cake" className="mt-0.5 text-pastel-purple" />
                <span>
                  <span className="text-pastel-purple">{t.birthday}:</span>{" "}
                  {EVENT.birthday}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Icon name="mother" className="mt-0.5 text-pastel-purple" />
                <span>
                  <span className="text-pastel-purple">{t.mother}:</span> {EVENT.mother}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Icon name="father" className="mt-0.5 text-pastel-purple" />
                <span>
                  <span className="text-pastel-purple">{t.father}:</span> {EVENT.father}
                </span>
              </p>
              <hr className="border-black/20" />
              <p className="flex items-start gap-2">
                <Icon name="church" className="mt-0.5 text-pastel-purple" />
                <span>
                  <span className="text-pastel-purple">{t.ceremony}:</span> {ceremonyTime}
                  <br />
                  <span className="opacity-70">{EVENT.ceremonyPlace}</span>
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Icon name="celebrate" className="mt-0.5 text-pastel-purple" />
                <span>
                  <span className="text-pastel-purple">{t.reception}:</span>{" "}
                  {receptionTime}
                  <br />
                  <span className="opacity-70">{EVENT.receptionPlace}</span>
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-[14px] sm:text-[16px] mb-2">
                <Icon name="guests" className="mr-1.5" />
                {t.guestCount}
              </label>
              {maxGuests > 1 ? (
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`pixel-btn w-10 h-10 border-4 border-black text-[17px] ${
                        count === n ? "bg-pastel-green" : "bg-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] opacity-70">{t.invitedForOne}</p>
              )}
              <p className="text-[12px] opacity-60 mt-1">{t.maxGuestsNote(maxGuests)}</p>
            </div>

            {maxKids > 0 ? (
              <div className="mb-4">
                <label className="block text-[14px] sm:text-[16px] mb-2">
                  <Icon name="child" className="mr-1.5" />
                  {t.kidsCount}
                </label>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: maxKids + 1 }, (_, i) => i).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setKids(n)}
                      className={`pixel-btn w-10 h-10 border-4 border-black text-[17px] ${
                        kids === n ? "bg-pastel-green" : "bg-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] opacity-60 mt-1">{t.maxKidsNote(maxKids)}</p>
              </div>
            ) : (
              <p className="text-[13px] opacity-70 mb-4 flex items-start gap-2">
                <Icon name="child" className="mt-0.5" /> {t.noKidsNote}
              </p>
            )}

            {error && (
              <p className="text-red-600 text-[14px] mb-3 break-words flex items-center gap-2">
                <Icon name="warning" /> {error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                disabled={submitting}
                onClick={() => submit("ATTENDING")}
                className="pixel-btn bg-pastel-green border-4 border-black py-3 text-[16px] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Icon name="spinner" spin /> {t.sending}
                  </>
                ) : (
                  <>
                    <Icon name="check" /> {t.yes}
                  </>
                )}
              </button>
              <button
                disabled={submitting}
                onClick={() => submit("DECLINED")}
                className="pixel-btn bg-pastel-pink border-4 border-black py-3 text-[16px] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Icon name="spinner" spin /> {t.sending}
                  </>
                ) : (
                  <>
                    <Icon name="decline" /> {t.no}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-black py-4">
            <div className="text-4xl mb-4">
              <Icon
                name={result === "ATTENDING" ? "celebrate" : "mail"}
                className={result === "ATTENDING" ? "text-yellow-500" : "text-pastel-purple"}
              />
            </div>
            <h2 className="text-[19px] sm:text-[21px] leading-relaxed mb-3">
              {result === "ATTENDING" ? t.thanks : t.willMiss}
            </h2>
            <p className="text-[14px] sm:text-[16px] leading-relaxed">
              {result === "ATTENDING" ? t.thanksBody(count, kids) : t.declinedBody}
            </p>
            {demo && (
              <p className="mt-3 text-[13px] leading-relaxed text-pastel-purple">
                {t.demoNotice}
              </p>
            )}
            <button
              onClick={() => setResult(null)}
              className="pixel-btn mt-5 mr-2 bg-pastel-green border-4 border-black py-2 px-4 text-[16px] inline-flex items-center gap-2"
            >
              <Icon name="check" /> {t.changeReply}
            </button>
            <button
              onClick={onClose}
              className="pixel-btn mt-5 bg-pastel-blue border-4 border-black py-2 px-4 text-[16px] inline-flex items-center gap-2"
            >
              <Icon name="close" /> {t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

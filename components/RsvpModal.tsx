"use client";

import { useState } from "react";
import { EVENT } from "@/lib/config";
import { OscarSays } from "@/components/Oscar";
import Icon from "@/components/Icon";
import Leaderboard from "@/components/Leaderboard";
import { DICTS, type Lang } from "@/lib/i18n";

type Guest = {
  guestCode: string;
  name: string;
  status: string;
  guestCount: number;
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
  lang: Lang;
  run?: RunResult | null;
  leaderboardKey?: number;
  onClose: () => void;
};

export default function RsvpModal({
  guest,
  lang,
  run,
  leaderboardKey = 0,
  onClose,
}: Props) {
  const t = DICTS[lang];
  const [count, setCount] = useState(
    guest?.guestCount && guest.guestCount > 0 ? guest.guestCount : 1
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | "ATTENDING" | "DECLINED">(null);
  const [error, setError] = useState<string | null>(null);

  const name = guest?.name ?? "Friend";
  const ceremonyTime = lang === "en" ? EVENT.ceremonyTimeEn : EVENT.ceremonyTime;
  const receptionTime = lang === "en" ? EVENT.receptionTimeEn : EVENT.receptionTime;

  async function submit(status: "ATTENDING" | "DECLINED") {
    if (!guest) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestCode: guest.guestCode,
          status,
          guestCount: status === "ATTENDING" ? count : 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || t.genericError);
      }
      setResult(status);
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
              <h1 className="text-[13px] sm:text-base leading-relaxed">
                {t.rsvpWelcome(name)}
              </h1>
              <p className="text-[9px] sm:text-[10px] mt-2 text-pastel-purple">
                {t.invitedTo}
              </p>
            </div>

            {/* Run summary — only after actually playing to the church */}
            {run && (
              <div className="bg-white border-4 border-black p-3 mb-4 text-[9px] leading-relaxed">
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
              <OscarSays>{t.oscarChurch}</OscarSays>
            </div>

            <div className="bg-white border-4 border-black p-3 text-[9px] sm:text-[10px] leading-relaxed space-y-2 mb-4">
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
              <label className="block text-[9px] sm:text-[10px] mb-2">
                <Icon name="guests" className="mr-1.5" />
                {t.guestCount}
              </label>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`pixel-btn w-10 h-10 border-4 border-black text-[11px] ${
                      count === n ? "bg-pastel-green" : "bg-white"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-[9px] mb-3 break-words flex items-center gap-2">
                <Icon name="warning" /> {error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                disabled={submitting}
                onClick={() => submit("ATTENDING")}
                className="pixel-btn bg-pastel-green border-4 border-black py-3 text-[10px] disabled:opacity-50 flex items-center justify-center gap-2"
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
                className="pixel-btn bg-pastel-pink border-4 border-black py-3 text-[10px] disabled:opacity-50 flex items-center justify-center gap-2"
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
            <h2 className="text-[12px] sm:text-sm leading-relaxed mb-3">
              {result === "ATTENDING" ? t.thanks : t.willMiss}
            </h2>
            <p className="text-[9px] sm:text-[10px] leading-relaxed">
              {result === "ATTENDING" ? t.thanksBody(count) : t.declinedBody}
            </p>
            <button
              onClick={onClose}
              className="pixel-btn mt-5 bg-pastel-blue border-4 border-black py-2 px-4 text-[10px] inline-flex items-center gap-2"
            >
              <Icon name="close" /> {t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

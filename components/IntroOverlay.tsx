"use client";

import { useState } from "react";
import { OscarSays } from "@/components/Oscar";
import { BernardoSays } from "@/components/Bernardo";
import Icon from "@/components/Icon";
import { LANGS, LANG_LABEL, type Lang, DICTS } from "@/lib/i18n";
import { guestGreetingList } from "@/lib/names";

/**
 * The intro used to be one long screen — language picker, two speech bubbles,
 * the controls and both buttons all at once. It is a wizard now: one decision
 * per step, so nothing has to be scrolled past to reach the next choice.
 *
 *   language (only when the link carried no `?lang=`) → play or skip →
 *   the story & the goal → the controls → play
 */
type Step = "lang" | "start" | "story" | "controls";

type Props = {
  name: string;
  lang: Lang;
  /** False when the invitation link already carried a language — the wizard then skips its first step. */
  askLanguage: boolean;
  onLangChange: (lang: Lang) => void;
  onPlay: () => void;
  onSkip: () => void;
};

export default function IntroOverlay({
  name,
  lang,
  askLanguage,
  onLangChange,
  onPlay,
  onSkip,
}: Props) {
  const t = DICTS[lang];
  // "Marie and Kevin" is one invitation but two people: Bernardo greets each of
  // them by name, in the language the invitation was opened in.
  const guests = guestGreetingList(name, lang);

  // The step list is fixed on mount: picking a language writes `?lang=` to the
  // URL, and the language step must not disappear from under the guest's feet.
  const [steps, setSteps] = useState<Step[]>(() =>
    askLanguage ? ["lang", "start", "story", "controls"] : ["start", "story", "controls"]
  );
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const goNext = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setIndex((i) => Math.max(i - 1, 0));

  const chooseLang = (l: Lang) => {
    onLangChange(l);
    goNext();
  };

  // An invitation opened in the wrong language still has to be switchable, so
  // the language step is added on demand when the link brought its own.
  const openLanguage = () => {
    setSteps((s) => (s[0] === "lang" ? s : ["lang", ...s]));
    setIndex(0);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
      <div className="pixel-border bg-white border-4 border-black w-full max-w-md max-h-[92dvh] overflow-y-auto text-black">
        <div className="flex flex-col gap-6 p-5 sm:p-7">
          {/* Progress: one dot per step, so the guest can see how short this is. */}
          <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
            <span />
            <div
              className="flex items-center justify-center gap-2.5"
              role="status"
              aria-label={t.stepOf(index + 1, steps.length)}
            >
              {steps.map((s, i) => (
                <span
                  key={s}
                  aria-hidden
                  className={`h-2 w-2 border-2 border-black ${
                    i === index ? "bg-pastel-purple" : i < index ? "bg-black" : "bg-white"
                  }`}
                />
              ))}
            </div>
            {steps[0] === "lang" ? (
              <span />
            ) : (
              <button
                onClick={openLanguage}
                aria-label={t.chooseLanguage}
                title={t.chooseLanguage}
                className="pixel-btn justify-self-end border-2 border-black bg-white p-1"
              >
                <Icon name="language" className="h-4 w-4" />
              </button>
            )}
          </div>

          {step === "lang" && (
            <section className="flex flex-col gap-4">
              <h2 className="flex items-center justify-center gap-2 text-[15px] leading-relaxed text-center">
                <Icon name="language" className="icon-inline opacity-75" />
                {LANGS.map((l) => DICTS[l].language).join(" · ")}
              </h2>
              <div className="flex flex-col gap-3">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    onClick={() => chooseLang(l)}
                    aria-pressed={lang === l}
                    className={`pixel-btn flex items-center justify-between gap-2 border-4 border-black px-4 py-3 text-left text-[15px] ${
                      lang === l ? "bg-pastel-green" : "bg-white"
                    }`}
                  >
                    <span>{LANG_LABEL[l]}</span>
                    <Icon name="right" className="h-4 w-4 shrink-0 opacity-75" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === "start" && (
            <section className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-center gap-4 text-2xl text-pastel-plum">
                <Icon name="dog" className="text-[#a58e6f]" />
                <Icon name="baby" className="text-[#d98ba5]" />
                <Icon name="cross" />
              </div>
              <h1 className="text-[19px] leading-relaxed">{t.title}</h1>
              <p className="text-[14px] leading-relaxed text-pastel-plum">
                {t.welcome(name)}
              </p>
              <div className="w-full">
                <BernardoSays>
                  {t.bernardoIntro.hi}
                  <b>{t.bernardoIntro.name}</b>
                  {t.bernardoIntro.welcome(guests)}
                </BernardoSays>
              </div>
            </section>
          )}

          {step === "story" && (
            <section className="flex flex-col gap-4">
              <h2 className="text-[15px] leading-relaxed text-center">{t.storyTitle}</h2>
              <BernardoSays>
                {t.bernardoIntro.church.trim()}
                {t.bernardoIntro.feed}
              </BernardoSays>
              <OscarSays>
                {t.oscarIntro.p1}
                <b>{t.oscarIntro.name}</b>
                {t.oscarIntro.p2}
                <span className="text-amber-700 whitespace-nowrap">
                  {t.oscarIntro.blessings} <Icon name="cross" className="icon-inline" />
                </span>
                {t.oscarIntro.p3}
                <b className="whitespace-nowrap">
                  {t.oscarIntro.treats} <Icon name="bone" className="icon-inline" />
                </b>
                {t.oscarIntro.p4}
                {t.oscarIntro.daily}
              </OscarSays>
              <div className="border-2 border-black bg-pastel-cream p-4 text-left text-[13px] leading-relaxed">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <Icon name="cross" className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>{t.goalTitle}</span>
                </div>
                <p>{t.goalText}</p>
              </div>
            </section>
          )}

          {step === "controls" && (
            <section className="flex flex-col gap-4">
              <h2 className="flex items-center justify-center gap-2 text-[15px] leading-relaxed">
                <Icon name="keyboard" className="icon-inline opacity-75" />
                {t.howToPlay}
              </h2>
              <ul className="grid grid-cols-[3.25rem_1fr] items-center gap-x-4 gap-y-3 border-2 border-black bg-pastel-cream p-4 text-left text-[13px] leading-relaxed">
                <li className="flex items-center justify-center gap-1" aria-hidden>
                  <Icon name="left" className="h-4 w-4" />
                  <Icon name="right" className="h-4 w-4" />
                </li>
                <li>{t.howMove}</li>

                <li className="flex items-center justify-center" aria-hidden>
                  <Icon name="up" className="h-4 w-4" />
                </li>
                <li>{t.howJump}</li>

                <li className="flex items-center justify-center" aria-hidden>
                  <Icon name="cross" className="h-4 w-4 text-amber-700" />
                </li>
                <li>{t.howCrosses}</li>

                <li className="flex items-center justify-center gap-1" aria-hidden>
                  <Icon name="bone" className="h-4 w-4" />
                  <Icon name="ball" className="h-4 w-4" />
                </li>
                <li>{t.howBones}</li>
              </ul>
            </section>
          )}

          {/* One primary action per step, with the quiet ones on a shared row. */}
          {step !== "lang" && (
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={step === "controls" ? onPlay : goNext}
                className="pixel-btn flex items-center justify-center gap-2 border-4 border-black bg-pastel-green py-3 text-[16px] text-black"
              >
                <Icon name={step === "story" ? "right" : "play"} className="h-5 w-5 shrink-0" />
                <span>{step === "story" ? t.next : t.play}</span>
              </button>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                {index > 0 ? (
                  <button
                    onClick={goBack}
                    className="pixel-btn flex items-center gap-1 border-2 border-black bg-white px-3 py-2"
                  >
                    <Icon name="left" className="h-4 w-4 shrink-0" />
                    <span>{t.back}</span>
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={onSkip}
                  className="pixel-btn flex items-center gap-1 border-2 border-black bg-white px-3 py-2 opacity-90"
                >
                  <span>{t.skipToAnswer}</span>
                  <Icon name="skip" className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

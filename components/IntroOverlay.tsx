"use client";

import { OscarSays } from "@/components/Oscar";
import Icon from "@/components/Icon";
import { LANGS, LANG_LABEL, type Lang, DICTS } from "@/lib/i18n";

type Props = {
  name: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onPlay: () => void;
  onSkip: () => void;
};

export default function IntroOverlay({
  name,
  lang,
  onLangChange,
  onPlay,
  onSkip,
}: Props) {
  const t = DICTS[lang];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
      <div className="pixel-border bg-white border-4 border-black p-5 sm:p-6 max-w-md w-full text-black text-center max-h-[92dvh] overflow-y-auto">
        {/* Language picker — Danish is the default, English is remembered */}
        <div className="flex items-center justify-center gap-2 mb-4 text-[13px]">
          <Icon name="language" className="opacity-60" />
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => onLangChange(l)}
              aria-pressed={lang === l}
              className={`pixel-btn border-2 border-black px-2 py-1 ${
                lang === l ? "bg-pastel-green" : "bg-white opacity-70"
              }`}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 text-2xl mb-2 text-pastel-purple">
          <Icon name="dog" className="text-[#a58e6f]" />
          <Icon name="baby" className="text-[#d98ba5]" />
          <Icon name="cross" />
        </div>
        <h1 className="text-[19px] leading-relaxed mb-1">{t.title}</h1>
        <p className="text-[14px] leading-relaxed text-pastel-purple mb-4">
          {t.welcome(name)}
        </p>

        <div className="mb-4">
          <OscarSays>
            {t.oscarIntro.p1}
            <b>{t.oscarIntro.name}</b>
            {t.oscarIntro.p2}
            <span className="text-yellow-600">
              {t.oscarIntro.blessings} <Icon name="cross" />
            </span>
            {t.oscarIntro.p3}
            <b>
              {t.oscarIntro.treats} <Icon name="bone" />
            </b>
            {t.oscarIntro.p4}
          </OscarSays>
        </div>

        <div className="text-left text-[13px] leading-relaxed bg-pastel-cream border-2 border-black p-3 mb-4 space-y-1">
          <div className="mb-1 font-bold">{t.howToPlay}</div>
          <div className="flex items-center gap-2">
            <Icon name="left" />
            <Icon name="right" />
            <span>{t.howMove}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="up" />
            <span>{t.howJump}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="cross" className="text-yellow-600" />
            <span>{t.howCrosses}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="bone" />
            <Icon name="ball" />
            <span>{t.howBones}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onPlay}
            className="pixel-btn bg-pastel-green border-4 border-black text-black text-[16px] py-3 flex items-center justify-center gap-2"
          >
            <Icon name="play" /> {t.play}
          </button>
          <button
            onClick={onSkip}
            className="pixel-btn bg-white border-4 border-black text-black text-[14px] py-2 opacity-90 flex items-center justify-center gap-2"
          >
            {t.skipToAnswer} <Icon name="skip" />
          </button>
        </div>
      </div>
    </div>
  );
}

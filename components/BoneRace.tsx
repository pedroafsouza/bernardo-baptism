"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { DICTS, type Lang } from "@/lib/i18n";

export type BoneEntry = {
  rank: number;
  name: string;
  bones: number;
  guestCode: string;
};

type Props = {
  lang: Lang;
  /** Highlights the current guest's row. */
  highlightCode?: string;
  /** Bumped by the parent once the last bones have been handed in. */
  refreshKey?: number;
};

const MEDAL_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-700"];

/**
 * The bone competition: who has fed Oscar the most. Two standings share one
 * panel — today's race, which resets with every new layout of bones, and the
 * running total since the invitations went out.
 */
export default function BoneRace({ lang, highlightCode, refreshKey = 0 }: Props) {
  const t = DICTS[lang];
  const [data, setData] = useState<{ today: BoneEntry[]; allTime: BoneEntry[] } | null>(
    null
  );
  const [tab, setTab] = useState<"today" | "allTime">("today");

  useEffect(() => {
    let active = true;
    fetch("/api/bones/leaderboard")
      .then((r) => (r.ok ? r.json() : { today: [], allTime: [] }))
      .then((d) => {
        if (active) setData({ today: d.today ?? [], allTime: d.allTime ?? [] });
      })
      .catch(() => active && setData({ today: [], allTime: [] }));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const entries = data ? data[tab] : null;

  return (
    <div className="bg-white border-4 border-black p-3 text-[14px] leading-relaxed">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center gap-2 font-bold flex-1">
          <Icon name="bone" />
          {t.boneRace}
        </span>
        <span className="flex gap-1 text-[12px]">
          {(["today", "allTime"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`pixel-btn border-2 border-black px-2 py-0.5 ${
                tab === key ? "bg-pastel-green" : "bg-white opacity-70"
              }`}
            >
              {key === "today" ? t.boneRaceToday : t.boneRaceAllTime}
            </button>
          ))}
        </span>
      </div>

      {entries === null && (
        <p className="opacity-60 flex items-center gap-2">
          <Icon name="spinner" spin /> {t.loading}
        </p>
      )}

      {entries !== null && entries.length === 0 && (
        <p className="opacity-60">{t.boneRaceEmpty}</p>
      )}

      {entries !== null && entries.length > 0 && (
        <ol className="space-y-1">
          {entries.map((e) => (
            <li
              key={e.guestCode}
              className={`flex items-center gap-2 px-2 py-1 border-2 ${
                e.guestCode === highlightCode
                  ? "border-black bg-pastel-green"
                  : "border-transparent"
              }`}
            >
              <span className="w-6 shrink-0 text-center">
                {e.rank <= 3 ? (
                  <Icon name="medal" className={MEDAL_COLORS[e.rank - 1]} />
                ) : (
                  e.rank
                )}
              </span>
              <span className="flex-1 truncate">{e.name}</span>
              <span className="flex items-center gap-1 font-bold">
                <Icon name="bone" /> {e.bones}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

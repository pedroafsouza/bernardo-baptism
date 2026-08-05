"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { DICTS, type Lang } from "@/lib/i18n";

export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  bones: number;
  guestCode: string;
};

type Props = {
  lang: Lang;
  /** Highlights the current guest's row. */
  highlightCode?: string;
  /** Bumped by the parent after a score is submitted to force a refresh. */
  refreshKey?: number;
};

const MEDAL_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export default function Leaderboard({ lang, highlightCode, refreshKey = 0 }: Props) {
  const t = DICTS[lang];
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => {
        if (active) setEntries(d.entries ?? []);
      })
      .catch(() => active && setEntries([]));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className="bg-white border-4 border-black p-3 text-[9px] leading-relaxed">
      <div className="flex items-center gap-2 mb-2 font-bold">
        <Icon name="trophy" className="text-yellow-500" />
        {t.leaderboard}
      </div>

      {entries === null && (
        <p className="opacity-60 flex items-center gap-2">
          <Icon name="spinner" spin /> {t.loading}
        </p>
      )}

      {entries !== null && entries.length === 0 && (
        <p className="opacity-60">{t.leaderboardEmpty}</p>
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
              <span className="flex items-center gap-1 opacity-70">
                <Icon name="bone" /> {e.bones}
              </span>
              <span className="w-14 text-right font-bold">{e.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

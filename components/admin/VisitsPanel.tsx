"use client";

/**
 * The visits menu: who has actually opened their invitation.
 *
 * An invitation sent is not an invitation seen, and until now the hosts could
 * only guess at the difference. This shows arrivals by country, browser and
 * device, separates the public demo from real invitations, and — the part that
 * matters most before the deadline — lists which households have never looked.
 */
import { useCallback, useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import type { AdminDict } from "@/lib/adminI18n";

type Row = { key: string; visits: number; visitors: number };

type GuestRow = {
  guestCode: string;
  name: string;
  visits: number;
  lastSeen: string | null;
};

type Stats = {
  days: number;
  windows: number[];
  totals: {
    visits: number;
    visitors: number;
    demo: number;
    invitations: number;
    opened: number;
    invited: number;
  };
  countries: Row[];
  browsers: Row[];
  systems: Row[];
  devices: Row[];
  languages: Row[];
  referrers: Row[];
  daily: Row[];
  guests: GuestRow[];
  demoCode: string;
};

/** Country codes are letters; a flag is what a human actually recognises. */
function flagOf(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)
  );
}

function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white border-4 border-black p-3">
      <div className="text-[12px] opacity-70 flex items-center gap-1.5">
        <Icon name={icon} className="h-4 w-4 shrink-0" /> {label}
      </div>
      <div className="text-[22px] leading-tight mt-1">{value}</div>
      {hint && <div className="text-[12px] opacity-60 mt-0.5">{hint}</div>}
    </div>
  );
}

/** A breakdown, drawn as bars so the shape is readable without reading. */
function Breakdown({
  icon,
  title,
  rows,
  t,
  label,
}: {
  icon: IconName;
  title: string;
  rows: Row[];
  t: AdminDict;
  label?: (key: string) => string;
}) {
  const top = rows[0]?.visits ?? 0;
  return (
    <div className="bg-white border-4 border-black p-3">
      <div className="text-[14px] flex items-center gap-2 mb-2">
        <Icon name={icon} className="h-4 w-4 shrink-0" /> {title}
      </div>
      {rows.length === 0 && <p className="text-[13px] opacity-60">{t.noVisitsYet}</p>}
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.key} className="text-[13px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate">{label ? label(row.key) : row.key}</span>
              <span className="shrink-0 opacity-70">
                {row.visits} · {t.visitorCount(row.visitors)}
              </span>
            </div>
            <div className="h-2 border-2 border-black bg-pastel-cream mt-0.5">
              <div
                className="h-full bg-pastel-blue"
                style={{ width: `${top > 0 ? (row.visits / top) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VisitsPanel({ t, locale }: { t: AdminDict; locale: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/visits?days=${days}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(t.couldNotLoad);
      setStats(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message || t.couldNotLoad);
    } finally {
      setLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const date = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale) : "—";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[16px] flex items-center gap-2">
          <Icon name="views" /> {t.menuVisits}
        </h2>
        <div className="flex items-center gap-1.5 ml-auto">
          {(stats?.windows ?? [7, 30, 0]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              aria-pressed={days === w}
              className={`pixel-btn border-2 border-black px-2 py-1 text-[13px] ${
                days === w ? "bg-pastel-green" : "bg-white opacity-70"
              }`}
            >
              {w === 0 ? t.allTime : t.lastDays(w)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[14px] text-pastel-plum flex items-center gap-2">
          <Icon name="warning" /> {error}
        </p>
      )}
      {loading && !stats && <p className="text-[14px] opacity-60">{t.loading}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card
              icon="views"
              label={t.totalVisits}
              value={stats.totals.visits}
              hint={t.visitorCount(stats.totals.visitors)}
            />
            <Card
              icon="mail"
              label={t.invitationsOpened}
              value={`${stats.totals.opened} / ${stats.totals.invited}`}
              hint={t.householdsOpened}
            />
            <Card
              icon="guests"
              label={t.realInvitations}
              value={stats.totals.invitations}
              hint={t.demoViews(stats.totals.demo)}
            />
            <Card
              icon="country"
              label={t.countries}
              value={stats.countries.length}
              hint={stats.countries
                .slice(0, 3)
                .map((c) => `${flagOf(c.key)} ${c.key}`)
                .join(" ")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <Breakdown
              icon="country"
              title={t.countries}
              rows={stats.countries}
              t={t}
              label={(key) => `${flagOf(key)} ${key === "??" ? t.unknownCountry : key}`}
            />
            <Breakdown icon="browser" title={t.browsers} rows={stats.browsers} t={t} />
            <Breakdown icon="system" title={t.systems} rows={stats.systems} t={t} />
            <Breakdown icon="device" title={t.devices} rows={stats.devices} t={t} />
            <Breakdown
              icon="language"
              title={t.languages}
              rows={stats.languages}
              t={t}
              label={(key) => key.toUpperCase()}
            />
            <Breakdown icon="source" title={t.referrers} rows={stats.referrers} t={t} />
          </div>

          <div className="bg-white border-4 border-black p-3 overflow-x-auto">
            <div className="text-[14px] flex items-center gap-2 mb-2">
              <Icon name="guests" className="h-4 w-4 shrink-0" /> {t.visitsPerGuest}
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="p-1.5">{t.colName}</th>
                  <th className="p-1.5">{t.colCode}</th>
                  <th className="p-1.5">{t.totalVisits}</th>
                  <th className="p-1.5">{t.lastSeen}</th>
                </tr>
              </thead>
              <tbody>
                {stats.guests.map((g) => (
                  <tr
                    key={g.guestCode}
                    className={`border-b border-black/10 ${
                      g.visits === 0 ? "opacity-60" : ""
                    }`}
                  >
                    <td className="p-1.5">{g.name}</td>
                    <td className="p-1.5">{g.guestCode}</td>
                    <td className="p-1.5">{g.visits || t.neverOpened}</td>
                    <td className="p-1.5">{date(g.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[12px] opacity-60 flex items-start gap-2">
            <Icon name="lock" className="h-4 w-4 shrink-0" /> {t.visitsPrivacy}
          </p>
        </>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GROUPS, STATUSES } from "@/lib/config";
import Icon, { type IconName } from "@/components/Icon";
import InviteMessageModal from "@/components/admin/InviteMessageModal";
import DangerZone from "@/components/admin/DangerZone";

type Guest = {
  id: string;
  guestCode: string;
  name: string;
  group: string;
  status: string;
  guestCount: number;
  kids: number;
  likely: boolean;
  inviteSent: boolean;
  inviteSentAt: string | null;
  bones: number;
  blessings: number;
  score: number;
  playedAt: string | null;
  updatedAt: string;
};

const emptyForm = {
  id: "",
  guestCode: "",
  name: "",
  group: "Family",
  status: "PENDING",
  guestCount: 1,
  kids: 0,
  likely: true,
  inviteSent: false,
};

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSent, setFilterSent] = useState("ALL");
  const [form, setForm] = useState({ ...emptyForm });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [messageGuest, setMessageGuest] = useState<Guest | null>(null);

  // The session lives in an httpOnly cookie, so every admin call just sends
  // credentials and a 401 means "not logged in".
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guests", { credentials: "same-origin" });
      if (res.status === 401) {
        setAuthed(false);
        return false;
      }
      const data = await res.json();
      setGuests(data.guests || []);
      setAuthed(true);
      return true;
    } catch (e: any) {
      setError(e.message || "Kunne ikke indlæse");
      return false;
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setLoginError(d.error || "Login mislykkedes");
      return;
    }
    setPassword("");
    await load();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE", credentials: "same-origin" });
    setAuthed(false);
    setGuests([]);
    setUsername("");
    setPassword("");
  }

  async function saveGuest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Kunne ikke gemme");
      }
      setForm({ ...emptyForm });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteGuest(id: string) {
    if (!confirm("Slet denne gæst?")) return;
    await fetch(`/api/admin/guests?id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await load();
  }

  function editGuest(g: Guest) {
    setForm({
      id: g.id,
      guestCode: g.guestCode,
      name: g.name,
      group: g.group,
      status: g.status,
      guestCount: g.guestCount,
      kids: g.kids,
      likely: g.likely,
      inviteSent: g.inviteSent,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Optimistic toggle: the checkbox flips immediately and reverts if the server
   * refuses, so ticking off 58 invitations doesn't feel like waiting on a queue.
   */
  async function setInviteSent(g: Guest, sent: boolean) {
    setGuests((prev) =>
      prev.map((x) => (x.id === g.id ? { ...x, inviteSent: sent } : x))
    );
    setMessageGuest((m) => (m && m.id === g.id ? { ...m, inviteSent: sent } : m));
    const res = await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: g.id, inviteSent: sent }),
    });
    if (!res.ok) {
      setError("Kunne ikke opdatere 'invitation sendt'");
      await load();
    }
  }

  function copyUrl(code: string) {
    const url = `${window.location.origin}/?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  const filtered = useMemo(
    () =>
      guests.filter(
        (g) =>
          (filterGroup === "ALL" || g.group === filterGroup) &&
          (filterStatus === "ALL" || g.status === filterStatus) &&
          (filterSent === "ALL" ||
            (filterSent === "SENT" ? g.inviteSent : !g.inviteSent))
      ),
    [guests, filterGroup, filterStatus, filterSent]
  );

  // "What is missing" — everyone who still owes us an answer, whose invitation
  // hasn't gone out yet, and who hasn't played the game.
  const missing = useMemo(() => {
    const notSent = guests.filter((g) => !g.inviteSent);
    const noAnswer = guests.filter((g) => g.inviteSent && g.status === "PENDING");
    const notPlayed = guests.filter((g) => !g.playedAt);
    return { notSent, noAnswer, notPlayed };
  }, [guests]);

  const metrics = useMemo(() => {
    const invited = guests.length;
    const attending = guests.filter((g) => g.status === "ATTENDING");
    const declined = guests.filter((g) => g.status === "DECLINED").length;
    const pending = guests.filter((g) => g.status === "PENDING").length;
    const adults = attending.reduce((s, g) => s + (g.guestCount || 0), 0);
    const kids = attending.reduce((s, g) => s + (g.kids || 0), 0);
    const played = guests.filter((g) => g.playedAt).length;
    const sent = guests.filter((g) => g.inviteSent).length;
    return {
      invited,
      confirmed: attending.length,
      adults,
      kids,
      attendeeCount: adults + kids,
      declined,
      pending,
      played,
      sent,
    };
  }, [guests]);

  function exportCsv() {
    const header = [
      "guestCode", "name", "group", "status", "guestCount", "kids", "likely",
      "inviteSent", "inviteSentAt", "bones", "blessings", "score", "playedAt", "updatedAt",
    ];
    const rows = guests.map((g) =>
      [
        g.guestCode, g.name, g.group, g.status, g.guestCount, g.kids, g.likely,
        g.inviteSent, g.inviteSentAt ?? "",
        g.bones, g.blessings, g.score, g.playedAt ?? "", g.updatedAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barnedaab-gaester-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-pastel-blue text-black text-[10px]">
        <Icon name="spinner" spin className="mr-2" /> Indlæser…
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-pastel-blue">
        <form
          onSubmit={login}
          className="pixel-border bg-pastel-cream border-4 border-black p-6 w-full max-w-sm text-black"
        >
          <h1 className="text-[12px] mb-5 text-center flex items-center justify-center gap-2">
            <Icon name="lock" /> Admin-login
          </h1>

          <label className="block text-[8px] mb-1 opacity-70">Brugernavn</label>
          <div className="flex items-center border-4 border-black bg-white mb-3">
            <span className="px-3 text-black/50">
              <Icon name="user" />
            </span>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="brugernavn"
              className="w-full p-3 text-[10px] bg-white outline-none"
            />
          </div>

          <label className="block text-[8px] mb-1 opacity-70">Adgangskode</label>
          <div className="flex items-center border-4 border-black bg-white mb-4">
            <span className="px-3 text-black/50">
              <Icon name="key" />
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full p-3 text-[10px] bg-white outline-none"
            />
          </div>

          {loginError && (
            <p className="text-red-600 text-[9px] mb-3 flex items-center gap-2">
              <Icon name="warning" /> {loginError}
            </p>
          )}

          <button className="pixel-btn w-full bg-pastel-green border-4 border-black py-3 text-[10px] flex items-center justify-center gap-2">
            <Icon name="lock" /> Log ind
          </button>
        </form>
      </main>
    );
  }

  const metricCards: { label: string; value: number; color: string; icon: IconName }[] = [
    { label: "Inviterede husstande", value: metrics.invited, color: "bg-pastel-blue", icon: "guests" },
    { label: "Invitationer sendt", value: metrics.sent, color: "bg-pastel-cream", icon: "sent" },
    { label: "Bekræftet", value: metrics.confirmed, color: "bg-pastel-green", icon: "attending" },
    { label: "Afbud", value: metrics.declined, color: "bg-pastel-pink", icon: "declined" },
    { label: "Afventer svar", value: metrics.pending, color: "bg-pastel-purple", icon: "pending" },
    { label: "Har spillet", value: metrics.played, color: "bg-pastel-yellow", icon: "trophy" },
  ];

  const ranked = [...guests].filter((g) => g.score > 0).sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-pastel-cream text-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h1 className="text-[13px] sm:text-base flex items-center gap-2">
            <Icon name="church" /> Barnedåb-admin
          </h1>
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="pixel-btn bg-pastel-green border-4 border-black py-2 px-3 text-[9px] flex items-center gap-2"
            >
              <Icon name="csv" /> Eksportér CSV
            </button>
            <button
              onClick={logout}
              className="pixel-btn bg-pastel-pink border-4 border-black py-2 px-3 text-[9px] flex items-center gap-2"
            >
              <Icon name="logout" /> Log ud
            </button>
          </div>
        </div>

        {/* Headline answer: how many have accepted, and how many people that is */}
        <div className="pixel-border bg-pastel-green border-4 border-black p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[9px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="attending" /> Accepteret
            </div>
            <div className="text-xl sm:text-2xl">
              {metrics.confirmed} <span className="text-[11px] opacity-70">af {metrics.invited}</span>
            </div>
            <div className="text-[8px] opacity-70 mt-1">
              invitationer besvaret med ja
            </div>
          </div>
          <div>
            <div className="text-[9px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="celebrate" /> Personer i alt
            </div>
            <div className="text-xl sm:text-2xl">{metrics.attendeeCount}</div>
            <div className="text-[8px] opacity-70 mt-1">
              {metrics.adults} voksne · {metrics.kids} børn
            </div>
          </div>
          <div>
            <div className="text-[9px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="sent" /> Invitationer sendt
            </div>
            <div className="text-xl sm:text-2xl">
              {metrics.sent} <span className="text-[11px] opacity-70">af {metrics.invited}</span>
            </div>
            <div className="text-[8px] opacity-70 mt-1">
              {metrics.invited - metrics.sent} mangler at blive sendt
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            <div className="h-4 border-4 border-black bg-white">
              <div
                className="h-full bg-black/70"
                style={{
                  width: `${
                    metrics.invited ? (metrics.sent / metrics.invited) * 100 : 0
                  }%`,
                }}
              />
            </div>
            <div className="text-[8px] mt-1 opacity-70">Udsendelses-fremdrift</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {metricCards.map((m) => (
            <div
              key={m.label}
              className={`pixel-border ${m.color} border-4 border-black p-3 text-center`}
            >
              <div className="text-black/50 text-[11px] mb-1">
                <Icon name={m.icon} />
              </div>
              <div className="text-lg sm:text-xl mb-1">{m.value}</div>
              <div className="text-[8px] leading-tight">{m.label}</div>
            </div>
          ))}
        </div>

        {/* What is missing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border-4 border-black p-4">
            <h2 className="text-[10px] mb-3 flex items-center gap-2">
              <Icon name="sent" className="text-blue-600" />
              Ikke sendt endnu ({missing.notSent.length})
            </h2>
            {missing.notSent.length === 0 ? (
              <p className="text-[9px] flex items-center gap-2 text-green-700">
                <Icon name="done" /> Alle invitationer er sendt!
              </p>
            ) : (
              <ul className="text-[9px] space-y-1 max-h-56 overflow-y-auto">
                {missing.notSent.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{g.name}</span>
                    <button
                      onClick={() => setMessageGuest(g)}
                      className="pixel-btn bg-pastel-green border-2 border-black px-2 py-1 shrink-0 flex items-center gap-1"
                    >
                      <Icon name="mail" /> Besked
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border-4 border-black p-4">
            <h2 className="text-[10px] mb-3 flex items-center gap-2">
              <Icon name="pending" className="text-amber-600" />
              Mangler svar ({missing.noAnswer.length})
            </h2>
            {missing.noAnswer.length === 0 ? (
              <p className="text-[9px] flex items-center gap-2 text-green-700">
                <Icon name="done" /> Alle inviterede har svaret!
              </p>
            ) : (
              <ul className="text-[9px] space-y-1 max-h-56 overflow-y-auto">
                {missing.noAnswer.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {g.name} <span className="opacity-50">· {g.group}</span>
                    </span>
                    <button
                      onClick={() => copyUrl(g.guestCode)}
                      className="pixel-btn bg-pastel-blue border-2 border-black px-2 py-1 shrink-0 flex items-center gap-1"
                    >
                      <Icon name="copy" />
                      {copiedCode === g.guestCode ? "Kopieret!" : "Link"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border-4 border-black p-4">
            <h2 className="text-[10px] mb-3 flex items-center gap-2">
              <Icon name="trophy" className="text-yellow-500" />
              Topliste
            </h2>
            {ranked.length === 0 ? (
              <p className="text-[9px] opacity-60">Ingen har spillet endnu.</p>
            ) : (
              <ol className="text-[9px] space-y-1 max-h-56 overflow-y-auto">
                {ranked.map((g, i) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <span className="w-5 text-center opacity-60">{i + 1}</span>
                    <span className="flex-1 truncate">{g.name}</span>
                    <span className="flex items-center gap-1 opacity-70">
                      <Icon name="bone" /> {g.bones}
                    </span>
                    <span className="w-12 text-right font-bold">{g.score}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-[8px] mt-3 opacity-60">
              Har ikke spillet endnu: {missing.notPlayed.length}
            </p>
          </div>
        </div>

        {/* Add / Edit form */}
        <form
          onSubmit={saveGuest}
          className="bg-white border-4 border-black p-4 mb-6 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
        >
          <div className="sm:col-span-6 text-[10px] flex items-center gap-2">
            <Icon name={form.id ? "edit" : "addGuest"} />
            {form.id ? "Rediger gæst" : "Tilføj gæst"}
          </div>
          <input
            required
            value={form.guestCode}
            onChange={(e) => setForm({ ...form, guestCode: e.target.value })}
            placeholder="GUEST_XYZ"
            className="border-4 border-black p-2 text-[9px] sm:col-span-1"
          />
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Navn"
            className="border-4 border-black p-2 text-[9px] sm:col-span-2"
          />
          <select
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value })}
            className="border-4 border-black p-2 text-[9px]"
          >
            {GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border-4 border-black p-2 text-[9px]"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            max={10}
            value={form.guestCount}
            onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
            title="Voksne"
            className="border-4 border-black p-2 text-[9px]"
          />
          <input
            type="number"
            min={0}
            max={10}
            value={form.kids}
            onChange={(e) => setForm({ ...form, kids: Number(e.target.value) })}
            title="Børn"
            className="border-4 border-black p-2 text-[9px]"
          />
          <label className="sm:col-span-3 flex items-center gap-2 text-[9px]">
            <input
              type="checkbox"
              checked={form.likely}
              onChange={(e) => setForm({ ...form, likely: e.target.checked })}
              className="w-4 h-4"
            />
            Forventes at komme
          </label>
          <label className="sm:col-span-3 flex items-center gap-2 text-[9px]">
            <input
              type="checkbox"
              checked={form.inviteSent}
              onChange={(e) => setForm({ ...form, inviteSent: e.target.checked })}
              className="w-4 h-4"
            />
            Invitation sendt
          </label>
          <div className="sm:col-span-6 flex gap-2">
            <button className="pixel-btn bg-pastel-green border-4 border-black py-2 px-4 text-[9px] flex items-center gap-2">
              <Icon name="check" /> {form.id ? "Opdater" : "Tilføj"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm({ ...emptyForm })}
                className="pixel-btn bg-pastel-yellow border-4 border-black py-2 px-4 text-[9px] flex items-center gap-2"
              >
                <Icon name="close" /> Annuller
              </button>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="flex gap-3 mb-3 flex-wrap text-[9px]">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="border-4 border-black p-2 bg-white"
          >
            <option value="ALL">Alle grupper</option>
            {GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border-4 border-black p-2 bg-white"
          >
            <option value="ALL">Alle statusser</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterSent}
            onChange={(e) => setFilterSent(e.target.value)}
            className="border-4 border-black p-2 bg-white"
          >
            <option value="ALL">Sendt: alle</option>
            <option value="SENT">Invitation sendt</option>
            <option value="NOT_SENT">Ikke sendt</option>
          </select>
          {loading && (
            <span className="self-center flex items-center gap-2">
              <Icon name="spinner" spin /> Indlæser…
            </span>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-[9px] mb-3 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}

        {/* Table */}
        <div className="overflow-x-auto border-4 border-black bg-white">
          <table className="w-full text-[9px] min-w-[980px]">
            <thead className="bg-pastel-blue">
              <tr>
                {[
                  "Sendt", "Kode", "Navn", "Gruppe", "Status",
                  "Voksne", "Børn", "Score", "Handlinger",
                ].map((h) => (
                  <th key={h} className="p-2 text-left border-b-4 border-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-b-2 border-black/10">
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={g.inviteSent}
                      onChange={(e) => setInviteSent(g, e.target.checked)}
                      title={
                        g.inviteSentAt
                          ? `Sendt ${new Date(g.inviteSentAt).toLocaleDateString("da-DK")}`
                          : "Marker som sendt"
                      }
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-2">{g.guestCode}</td>
                  <td className="p-2">
                    {g.name}
                    {!g.likely && (
                      <span className="ml-1 opacity-50" title="Forventes ikke at komme">
                        (?)
                      </span>
                    )}
                  </td>
                  <td className="p-2">{g.group}</td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 border-2 border-black ${
                        g.status === "ATTENDING"
                          ? "bg-pastel-green"
                          : g.status === "DECLINED"
                          ? "bg-pastel-pink"
                          : "bg-pastel-yellow"
                      }`}
                    >
                      <Icon
                        name={
                          g.status === "ATTENDING"
                            ? "attending"
                            : g.status === "DECLINED"
                            ? "declined"
                            : "pending"
                        }
                      />
                      {g.status}
                    </span>
                  </td>
                  <td className="p-2 text-center">{g.guestCount}</td>
                  <td className="p-2 text-center">
                    {g.kids > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="child" /> {g.kids}
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {g.score > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="star" className="text-yellow-500" />
                        {g.score}
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setMessageGuest(g)}
                        className="pixel-btn bg-pastel-green border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="mail" /> Se besked
                      </button>
                      <button
                        onClick={() => copyUrl(g.guestCode)}
                        className="pixel-btn bg-pastel-blue border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="copy" />
                        {copiedCode === g.guestCode ? "Kopieret!" : "Kopiér URL"}
                      </button>
                      <button
                        onClick={() => editGuest(g)}
                        className="pixel-btn bg-pastel-yellow border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="edit" /> Rediger
                      </button>
                      <button
                        onClick={() => deleteGuest(g.id)}
                        className="pixel-btn bg-pastel-pink border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="trash" /> Slet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center opacity-60">
                    Ingen gæster matcher filtrene.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DangerZone onDone={() => void load()} />
      </div>

      {messageGuest && (
        <InviteMessageModal
          name={messageGuest.name}
          guestCode={messageGuest.guestCode}
          inviteSent={messageGuest.inviteSent}
          onToggleSent={(sent) => setInviteSent(messageGuest, sent)}
          onClose={() => setMessageGuest(null)}
        />
      )}
    </main>
  );
}

"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { GROUPS, STATUSES } from "@/lib/config";
import Icon, { type IconName } from "@/components/Icon";
import InviteMessageModal from "@/components/admin/InviteMessageModal";
import DangerZone from "@/components/admin/DangerZone";
import AdminsPanel from "@/components/admin/AdminsPanel";
import AuditPanel from "@/components/admin/AuditPanel";
import PasswordChangeGate from "@/components/admin/PasswordChangeGate";
import { copyText } from "@/lib/clipboard";
import { clampParty, headcount } from "@/lib/capacity";
import {
  summarizeAllergies,
  summarizeAttendees,
  type AttendeeSlot,
} from "@/lib/attendees";
import {
  useAdminLang,
  ADMIN_LANGS,
  ADMIN_LANG_LABEL,
  type AdminLang,
} from "@/lib/adminI18n";
import { MESSAGE_LANGS, type MessageLang } from "@/lib/invite";

type Guest = {
  id: string;
  guestCode: string;
  name: string;
  group: string;
  status: string;
  maxGuests: number;
  maxKids: number;
  /** The christening and the party are answered — and counted — separately. */
  churchCount: number;
  churchKids: number;
  guestCount: number;
  kids: number;
  kidsAllergies: string;
  /** Who is on this invitation and what each of them answered. */
  attendees: AttendeeSlot[];
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
  maxGuests: 1,
  maxKids: 0,
  churchCount: 1,
  churchKids: 0,
  guestCount: 1,
  kids: 0,
  likely: true,
  inviteSent: false,
};

type AdminIdentity = {
  id: string;
  username: string;
  mustChangePassword: boolean;
};

type Tab = "guests" | "audit" | "admins" | "account";

function LangToggle({
  lang,
  setLang,
  label,
}: {
  lang: AdminLang;
  setLang: (l: AdminLang) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[14px]" title={label}>
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
  );
}

function AdminPageInner() {
  const { lang, setLang, t } = useAdminLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("guests");
  const [notice, setNotice] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSent, setFilterSent] = useState("ALL");
  const [form, setForm] = useState({ ...emptyForm });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  // Households whose individual answers are unfolded in the table.
  const [openPeople, setOpenPeople] = useState<Record<string, boolean>>({});
  const [messageGuest, setMessageGuest] = useState<Guest | null>(null);
  // Language the copied guest links open in — the guests are Danish, English
  // and Brazilian, so the link carries the language it was written for.
  const [linkLang, setLinkLang] = useState<MessageLang>("da");

  const authed = admin !== null;
  const mustChangePassword = admin?.mustChangePassword ?? false;
  const locale = lang === "en" ? "en-GB" : "da-DK";

  /** Records the browser-only actions (opening an invitation, copying a link). */
  const logAction = useCallback(
    (action: "INVITE_MESSAGE_OPENED" | "GUEST_LINK_COPIED", guestCode: string, detail?: string) => {
      void fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, guestCode, detail }),
      }).catch(() => undefined);
    },
    []
  );

  // The session lives in an httpOnly cookie; this asks the server who we are.
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/login", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (data?.authenticated && data.admin) {
        setAdmin({
          id: data.admin.id,
          username: data.admin.username,
          mustChangePassword: Boolean(data.mustChangePassword),
        });
        return Boolean(data.mustChangePassword) === false;
      }
      setAdmin(null);
      return false;
    } catch {
      setAdmin(null);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guests", { credentials: "same-origin" });
      if (res.status === 401) {
        setAdmin(null);
        return false;
      }
      if (res.status === 403) {
        // Temporary password: the panel is locked to the password screen.
        setAdmin((a) => (a ? { ...a, mustChangePassword: true } : a));
        return false;
      }
      const data = await res.json();
      setGuests(data.guests || []);
      return true;
    } catch (e: any) {
      setError(e.message || t.couldNotLoad);
      return false;
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const ready = await loadSession();
      if (ready) await load();
    })();
  }, [loadSession, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoginError(data.error || t.loginFailed);
      return;
    }
    setPassword("");
    setAdmin({
      id: data.admin.id,
      username: data.admin.username,
      mustChangePassword: Boolean(data.mustChangePassword),
    });
    if (!data.mustChangePassword) await load();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE", credentials: "same-origin" });
    setAdmin(null);
    setGuests([]);
    setUsername("");
    setPassword("");
    setTab("guests");
  }

  async function afterPasswordChange() {
    setNotice(t.passwordChanged);
    setAdmin((a) => (a ? { ...a, mustChangePassword: false } : a));
    setTab("guests");
    await load();
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
        throw new Error(d.error || t.couldNotSave);
      }
      setForm({ ...emptyForm });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteGuest(id: string) {
    if (!confirm(t.deleteConfirm)) return;
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
      maxGuests: g.maxGuests,
      maxKids: g.maxKids,
      churchCount: g.churchCount,
      churchKids: g.churchKids,
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
      setError(t.couldNotUpdateSent);
      await load();
    }
  }

  async function copyUrl(code: string) {
    const url = `${window.location.origin}/?code=${encodeURIComponent(
      code
    )}&lang=${linkLang}`;
    const ok = await copyText(url);
    if (!ok) {
      setError(t.copyFailed(url));
      return;
    }
    setError(null);
    setCopiedCode(code);
    logAction("GUEST_LINK_COPIED", code, `Language: ${linkLang}`);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  function openMessage(g: Guest) {
    setMessageGuest(g);
    logAction("INVITE_MESSAGE_OPENED", g.guestCode, g.name);
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

  // "What is missing" — everyone who still owes us an answer (whether or not the
  // invitation has been ticked off as sent), whose invitation hasn't gone out
  // yet, and who hasn't played the game.
  const missing = useMemo(() => {
    const notSent = guests.filter((g) => !g.inviteSent);
    const noAnswer = guests.filter((g) => g.status === "PENDING");
    const notPlayed = guests.filter((g) => !g.playedAt);
    return { notSent, noAnswer, notPlayed };
  }, [guests]);

  const metrics = useMemo(() => {
    const invited = guests.length;
    const attending = guests.filter((g) => g.status === "ATTENDING");
    const declined = guests.filter((g) => g.status === "DECLINED").length;
    const pending = guests.filter((g) => g.status === "PENDING").length;
    // Belt and braces for the final head count: an answer stored before a
    // capacity was tightened can never inflate the totals, and a household
    // invited without children never contributes any.
    const { adults, kids } = headcount(guests);
    // The church has its own head count: a godparent who cannot stay for dinner
    // still needs a seat at the christening.
    const church = attending.reduce(
      (sum, g) => {
        const fits = clampParty({ guestCount: g.churchCount, kids: g.churchKids }, g);
        return { adults: sum.adults + fits.guestCount, kids: sum.kids + fits.kids };
      },
      { adults: 0, kids: 0 }
    );
    const withAllergies = guests.filter(
      (g) => summarizeAllergies(g.attendees ?? [], g.kidsAllergies ?? "").length > 0
    ).length;
    const played = guests.filter((g) => g.playedAt).length;
    const sent = guests.filter((g) => g.inviteSent).length;
    return {
      invited,
      confirmed: attending.length,
      adults,
      kids,
      attendeeCount: adults + kids,
      churchAdults: church.adults,
      churchKids: church.kids,
      churchCount: church.adults + church.kids,
      declined,
      pending,
      played,
      sent,
      withAllergies,
    };
  }, [guests]);

  function exportCsv() {
    const header = [
      "guestCode", "name", "group", "status", "maxGuests", "maxKids",
      "churchCount", "churchKids", "guestCount", "kids", "likely",
      "people", "allergies",
      "inviteSent", "inviteSentAt", "bones", "blessings", "score", "playedAt", "updatedAt",
    ];
    const rows = guests.map((g) =>
      [
        g.guestCode, g.name, g.group, g.status, g.maxGuests, g.maxKids,
        g.churchCount, g.churchKids, g.guestCount, g.kids, g.likely,
        summarizeAttendees(g.attendees ?? []),
        summarizeAllergies(g.attendees ?? [], g.kidsAllergies ?? ""),
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
    a.download = `${t.csvFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-pastel-blue text-black text-[16px]">
        <Icon name="spinner" spin className="mr-2" /> {t.loading}
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
          <h1 className="text-[19px] mb-5 text-center flex items-center justify-center gap-2">
            <Icon name="lock" /> {t.adminLogin}
          </h1>

          <div className="flex justify-center mb-4">
            <LangToggle lang={lang} setLang={setLang} label={t.language} />
          </div>

          <label className="block text-[13px] mb-1 opacity-70">{t.username}</label>
          <div className="flex items-center border-4 border-black bg-white mb-3">
            <span className="px-3 text-black/50">
              <Icon name="user" />
            </span>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.usernamePlaceholder}
              className="w-full p-3 text-[16px] bg-white outline-none"
            />
          </div>

          <label className="block text-[13px] mb-1 opacity-70">{t.password}</label>
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
              className="w-full p-3 text-[16px] bg-white outline-none"
            />
          </div>

          {loginError && (
            <p className="text-red-600 text-[14px] mb-3 flex items-center gap-2">
              <Icon name="warning" /> {loginError}
            </p>
          )}

          <button className="pixel-btn w-full bg-pastel-green border-4 border-black py-3 text-[16px] flex items-center justify-center gap-2">
            <Icon name="lock" /> {t.login}
          </button>

          <p className="text-[12px] opacity-60 mt-4 leading-snug">{t.firstRunHint}</p>
        </form>
      </main>
    );
  }

  // A temporary password can do exactly one thing: become a strong one.
  if (mustChangePassword && admin) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-pastel-blue">
        <PasswordChangeGate
          t={t}
          username={admin.username}
          forced
          onDone={() => void afterPasswordChange()}
        />
      </main>
    );
  }

  const metricCards: { label: string; value: number; color: string; icon: IconName }[] = [
    { label: t.invitedHouseholds, value: metrics.invited, color: "bg-pastel-blue", icon: "guests" },
    { label: t.invitationsSent, value: metrics.sent, color: "bg-pastel-cream", icon: "sent" },
    { label: t.confirmed, value: metrics.confirmed, color: "bg-pastel-green", icon: "attending" },
    { label: t.declined, value: metrics.declined, color: "bg-pastel-pink", icon: "declined" },
    { label: t.awaitingReply, value: metrics.pending, color: "bg-pastel-purple", icon: "pending" },
    { label: t.hasPlayed, value: metrics.played, color: "bg-pastel-yellow", icon: "trophy" },
  ];

  const ranked = [...guests].filter((g) => g.score > 0).sort((a, b) => b.score - a.score);

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-pastel-cream text-black">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h1 className="text-[21px] sm:text-[24px] flex items-center gap-2">
            <Icon name="church" /> {t.title}
          </h1>
          <div className="flex gap-2 flex-wrap items-center">
            <LangToggle lang={lang} setLang={setLang} label={t.language} />
            {tab === "guests" && (
              <button
                onClick={exportCsv}
                className="pixel-btn bg-pastel-green border-4 border-black py-2 px-3 text-[14px] flex items-center gap-2"
              >
                <Icon name="csv" /> {t.exportCsv}
              </button>
            )}
            <button
              onClick={logout}
              className="pixel-btn bg-pastel-pink border-4 border-black py-2 px-3 text-[14px] flex items-center gap-2"
            >
              <Icon name="logout" /> {t.logout}
            </button>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex flex-wrap items-center gap-2 mb-5">
          {(
            [
              { id: "guests", label: t.menuGuests, icon: "guests" },
              { id: "audit", label: t.menuAudit, icon: "keyboard" },
              { id: "admins", label: t.menuAdmins, icon: "lock" },
              { id: "account", label: t.menuAccount, icon: "key" },
            ] as { id: Tab; label: string; icon: IconName }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setNotice(null);
                setTab(item.id);
              }}
              aria-current={tab === item.id ? "page" : undefined}
              className={`pixel-btn border-4 border-black py-2 px-3 text-[14px] flex items-center gap-2 ${
                tab === item.id ? "bg-pastel-blue" : "bg-white opacity-75"
              }`}
            >
              <Icon name={item.icon} /> {item.label}
            </button>
          ))}
          {admin && (
            <span className="text-[13px] opacity-60 ml-auto flex items-center gap-2">
              <Icon name="user" /> {t.signedInAs(admin.username)}
            </span>
          )}
        </nav>

        {notice && (
          <p className="text-green-700 text-[14px] mb-4 flex items-center gap-2">
            <Icon name="done" /> {notice}
          </p>
        )}

        {tab === "audit" && <AuditPanel t={t} locale={locale} />}

        {tab === "admins" && (
          <AdminsPanel t={t} locale={locale} onSelfRemoved={() => void logout()} />
        )}

        {tab === "account" && admin && (
          <PasswordChangeGate
            t={t}
            username={admin.username}
            forced={false}
            onDone={() => void afterPasswordChange()}
            onCancel={() => setTab("guests")}
          />
        )}

        {tab === "guests" && (
          <>
        {/* Headline answer: how many have accepted, and how many people that is */}
        <div className="pixel-border bg-pastel-green border-4 border-black p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[14px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="attending" /> {t.accepted}
            </div>
            <div className="text-xl sm:text-2xl">
              {metrics.confirmed} <span className="text-[17px] opacity-70">{t.ofTotal(metrics.invited)}</span>
            </div>
            <div className="text-[13px] opacity-70 mt-1">{t.answeredYes}</div>
          </div>
          <div>
            <div className="text-[14px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="church" /> {t.atChurch}
            </div>
            <div className="text-xl sm:text-2xl">{metrics.churchCount}</div>
            <div className="text-[13px] opacity-70 mt-1">
              {t.adultsKids(metrics.churchAdults, metrics.churchKids)}
            </div>
          </div>
          <div>
            <div className="text-[14px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="celebrate" /> {t.atReception}
            </div>
            <div className="text-xl sm:text-2xl">{metrics.attendeeCount}</div>
            <div className="text-[13px] opacity-70 mt-1">
              {t.adultsKids(metrics.adults, metrics.kids)}
            </div>
            {metrics.withAllergies > 0 && (
              <div className="text-[13px] mt-1 flex items-center gap-1.5">
                <Icon name="warning" className="h-4 w-4 shrink-0 text-yellow-700" />
                {t.allergyCount(metrics.withAllergies)}
              </div>
            )}
          </div>
          <div>
            <div className="text-[14px] opacity-70 mb-1 flex items-center gap-2">
              <Icon name="sent" /> {t.invitationsSent}
            </div>
            <div className="text-xl sm:text-2xl">
              {metrics.sent} <span className="text-[17px] opacity-70">{t.ofTotal(metrics.invited)}</span>
            </div>
            <div className="text-[13px] opacity-70 mt-1">
              {t.leftToSend(metrics.invited - metrics.sent)}
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
            <div className="text-[13px] mt-1 opacity-70">{t.sendProgress}</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {metricCards.map((m) => (
            <div
              key={m.label}
              className={`pixel-border ${m.color} border-4 border-black p-3 text-center`}
            >
              <div className="text-black/50 text-[17px] mb-1">
                <Icon name={m.icon} />
              </div>
              <div className="text-lg sm:text-xl mb-1">{m.value}</div>
              <div className="text-[13px] leading-tight">{m.label}</div>
            </div>
          ))}
        </div>

        {/* What is missing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border-4 border-black p-4">
            <h2 className="text-[16px] mb-3 flex items-center gap-2">
              <Icon name="sent" className="text-blue-600" />
              {t.notSentYet(missing.notSent.length)}
            </h2>
            {missing.notSent.length === 0 ? (
              <p className="text-[14px] flex items-center gap-2 text-green-700">
                <Icon name="done" /> {t.allInvitationsSent}
              </p>
            ) : (
              <ul className="text-[14px] space-y-1 max-h-56 overflow-y-auto">
                {missing.notSent.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{g.name}</span>
                    <button
                      onClick={() => openMessage(g)}
                      className="pixel-btn bg-pastel-green border-2 border-black px-2 py-1 shrink-0 flex items-center gap-1"
                    >
                      <Icon name="mail" /> {t.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border-4 border-black p-4">
            <h2 className="text-[16px] mb-3 flex items-center gap-2">
              <Icon name="pending" className="text-amber-600" />
              {t.missingReply(missing.noAnswer.length)}
            </h2>
            {missing.noAnswer.length === 0 ? (
              <p className="text-[14px] flex items-center gap-2 text-green-700">
                <Icon name="done" /> {t.everyoneAnswered}
              </p>
            ) : (
              <ul className="text-[14px] space-y-1 max-h-56 overflow-y-auto">
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
                      {copiedCode === g.guestCode ? t.copied : t.link}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border-4 border-black p-4">
            <h2 className="text-[16px] mb-3 flex items-center gap-2">
              <Icon name="trophy" className="text-yellow-500" />
              {t.leaderboard}
            </h2>
            {ranked.length === 0 ? (
              <p className="text-[14px] opacity-60">{t.nobodyPlayed}</p>
            ) : (
              <ol className="text-[14px] space-y-1 max-h-56 overflow-y-auto">
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
            <p className="text-[13px] mt-3 opacity-60">
              {t.notPlayedYet(missing.notPlayed.length)}
            </p>
          </div>
        </div>

        {/* Add / Edit form */}
        <form
          onSubmit={saveGuest}
          className="bg-white border-4 border-black p-4 mb-6 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
        >
          <div className="sm:col-span-6 text-[16px] flex items-center gap-2">
            <Icon name={form.id ? "edit" : "addGuest"} />
            {form.id ? t.editGuest : t.addGuest}
          </div>
          <input
            required
            value={form.guestCode}
            onChange={(e) => setForm({ ...form, guestCode: e.target.value })}
            placeholder="GUEST_XYZ"
            className="border-4 border-black p-2 text-[14px] sm:col-span-1"
          />
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t.namePlaceholder}
            className="border-4 border-black p-2 text-[14px] sm:col-span-2"
          />
          <select
            value={form.group}
            onChange={(e) => setForm({ ...form, group: e.target.value })}
            className="border-4 border-black p-2 text-[14px]"
          >
            {GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border-4 border-black p-2 text-[14px]"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={10}
            value={form.maxGuests}
            onChange={(e) => {
              const maxGuests = Number(e.target.value);
              setForm({
                ...form,
                maxGuests,
                guestCount: Math.min(form.guestCount, Math.max(maxGuests, 0)),
                churchCount: Math.min(form.churchCount, Math.max(maxGuests, 0)),
              });
            }}
            title={t.maxAdults}
            placeholder={t.maxAdults}
            className="border-4 border-black p-2 text-[14px]"
          />
          <input
            type="number"
            min={0}
            max={10}
            value={form.maxKids}
            onChange={(e) => {
              const maxKids = Number(e.target.value);
              setForm({
                ...form,
                maxKids,
                kids: Math.min(form.kids, Math.max(maxKids, 0)),
                churchKids: Math.min(form.churchKids, Math.max(maxKids, 0)),
              });
            }}
            title={t.maxKids}
            placeholder={t.maxKids}
            className="border-4 border-black p-2 text-[14px]"
          />
          <input
            type="number"
            min={0}
            max={form.maxGuests}
            value={form.churchCount}
            onChange={(e) => setForm({ ...form, churchCount: Number(e.target.value) })}
            title={t.churchAdults}
            placeholder={t.churchAdults}
            className="border-4 border-black p-2 text-[14px]"
          />
          <input
            type="number"
            min={0}
            max={form.maxKids}
            value={form.churchKids}
            onChange={(e) => setForm({ ...form, churchKids: Number(e.target.value) })}
            title={t.churchKids}
            placeholder={t.churchKids}
            disabled={form.maxKids === 0}
            className="border-4 border-black p-2 text-[14px] disabled:opacity-50"
          />
          <input
            type="number"
            min={0}
            max={form.maxGuests}
            value={form.guestCount}
            onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
            title={t.adults}
            placeholder={t.adults}
            className="border-4 border-black p-2 text-[14px]"
          />
          <input
            type="number"
            min={0}
            max={form.maxKids}
            value={form.kids}
            onChange={(e) => setForm({ ...form, kids: Number(e.target.value) })}
            title={t.kids}
            placeholder={t.kids}
            disabled={form.maxKids === 0}
            className="border-4 border-black p-2 text-[14px] disabled:opacity-50"
          />
          <label className="sm:col-span-3 flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={form.likely}
              onChange={(e) => setForm({ ...form, likely: e.target.checked })}
              className="w-4 h-4"
            />
            {t.expectedToCome}
          </label>
          <label className="sm:col-span-3 flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={form.inviteSent}
              onChange={(e) => setForm({ ...form, inviteSent: e.target.checked })}
              className="w-4 h-4"
            />
            {t.inviteSent}
          </label>
          <div className="sm:col-span-6 flex gap-2">
            <button className="pixel-btn bg-pastel-green border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2">
              <Icon name="check" /> {form.id ? t.update : t.add}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm({ ...emptyForm })}
                className="pixel-btn bg-pastel-yellow border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
              >
                <Icon name="close" /> {t.cancel}
              </button>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="flex gap-3 mb-3 flex-wrap text-[14px]">
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="border-4 border-black p-2 bg-white"
          >
            <option value="ALL">{t.allGroups}</option>
            {GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border-4 border-black p-2 bg-white"
          >
            <option value="ALL">{t.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterSent}
            onChange={(e) => setFilterSent(e.target.value)}
            className="border-4 border-black p-2 bg-white"
          >
            <option value="ALL">{t.sentAll}</option>
            <option value="SENT">{t.sentYes}</option>
            <option value="NOT_SENT">{t.sentNo}</option>
          </select>
          <label className="flex items-center gap-2 border-4 border-black p-2 bg-white">
            <span className="opacity-70">{t.linkLanguage}</span>
            <select
              value={linkLang}
              onChange={(e) => setLinkLang(e.target.value as MessageLang)}
              className="bg-white"
            >
              {MESSAGE_LANGS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {loading && (
            <span className="self-center flex items-center gap-2">
              <Icon name="spinner" spin /> {t.loading}
            </span>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-[14px] mb-3 flex items-center gap-2">
            <Icon name="warning" /> {error}
          </p>
        )}

        {/* Table */}
        <div className="overflow-x-auto border-4 border-black bg-white">
          <table className="w-full text-[14px] min-w-[980px]">
            <thead className="bg-pastel-blue">
              <tr>
                {[
                  t.colSent, t.colCode, t.colName, t.colGroup, t.colStatus,
                  t.atChurch, t.adults, t.kids, t.colScore, t.colActions,
                ].map((h) => (
                  <th key={h} className="p-2 text-left border-b-4 border-black">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const people = g.attendees ?? [];
                const allergies = summarizeAllergies(people, g.kidsAllergies ?? "");
                const expanded = openPeople[g.id] ?? false;
                return (
                <Fragment key={g.id}>
                <tr className="border-b-2 border-black/10">
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={g.inviteSent}
                      onChange={(e) => setInviteSent(g, e.target.checked)}
                      title={
                        g.inviteSentAt
                          ? t.sentOn(
                              new Date(g.inviteSentAt).toLocaleDateString(
                                lang === "en" ? "en-GB" : "da-DK"
                              )
                            )
                          : t.markAsSent
                      }
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-2">{g.guestCode}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      {/* One line in the list, several people behind it. */}
                      <button
                        type="button"
                        aria-expanded={expanded}
                        title={expanded ? t.hidePeople : t.showPeople}
                        onClick={() =>
                          setOpenPeople((o) => ({ ...o, [g.id]: !expanded }))
                        }
                        className="pixel-btn border-2 border-black bg-white p-0.5"
                      >
                        <Icon name={expanded ? "up" : "down"} className="h-4 w-4" />
                      </button>
                      <span>{g.name}</span>
                      {allergies && (
                        <Icon
                          name="warning"
                          className="h-4 w-4 shrink-0 text-yellow-700"
                          title={allergies}
                        />
                      )}
                      {!g.likely && (
                        <span className="opacity-50" title={t.notExpected}>
                          (?)
                        </span>
                      )}
                    </div>
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
                  <td className="p-2 text-center" title={t.atChurch}>
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {g.churchCount}
                        <span className="opacity-40">/{g.maxGuests}</span>
                      </span>
                      {g.maxKids > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="child" className="h-4 w-4 shrink-0 opacity-70" />
                          {g.churchKids}
                          <span className="opacity-40">/{g.maxKids}</span>
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-2 text-center" title={t.ofMax(g.maxGuests)}>
                    {g.guestCount}
                    <span className="opacity-40">/{g.maxGuests}</span>
                  </td>
                  <td className="p-2 text-center">
                    {g.maxKids === 0 ? (
                      <span className="opacity-40" title={t.noKidsInvited}>
                        —
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1"
                        title={t.ofMax(g.maxKids)}
                      >
                        <Icon name="child" /> {g.kids}
                        <span className="opacity-40">/{g.maxKids}</span>
                      </span>
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
                        onClick={() => openMessage(g)}
                        className="pixel-btn bg-pastel-green border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="mail" /> {t.viewMessage}
                      </button>
                      <button
                        onClick={() => copyUrl(g.guestCode)}
                        className="pixel-btn bg-pastel-blue border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="copy" />
                        {copiedCode === g.guestCode ? t.copied : t.copyUrl}
                      </button>
                      <button
                        onClick={() => editGuest(g)}
                        className="pixel-btn bg-pastel-yellow border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="edit" /> {t.edit}
                      </button>
                      <button
                        onClick={() => deleteGuest(g.id)}
                        className="pixel-btn bg-pastel-pink border-2 border-black px-2 py-1 flex items-center gap-1"
                      >
                        <Icon name="trash" /> {t.remove}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-b-2 border-black/10 bg-pastel-cream">
                    <td colSpan={10} className="p-3">
                      <div className="text-[13px] flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-bold">
                          <Icon name="guests" className="h-4 w-4 shrink-0" />
                          {t.whoIsComing}
                        </div>
                        <ul className="flex flex-col gap-1">
                          {people.map((person) => (
                            <li
                              key={person.position}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="min-w-[8rem]">{person.name}</span>
                              {/* Each half of the day is answered on its own. */}
                              {([
                                [t.atChurch, person.church],
                                [t.atReception, person.reception],
                              ] as const).map(([label, said]) => (
                                <span
                                  key={label}
                                  className={`inline-flex items-center gap-1 border-2 border-black px-2 py-0.5 ${
                                    said === "ATTENDING"
                                      ? "bg-pastel-green"
                                      : said === "DECLINED"
                                      ? "bg-pastel-pink"
                                      : "bg-pastel-yellow"
                                  }`}
                                >
                                  <Icon
                                    name={
                                      said === "ATTENDING"
                                        ? "attending"
                                        : said === "DECLINED"
                                        ? "declined"
                                        : "pending"
                                    }
                                    className="h-4 w-4 shrink-0"
                                  />
                                  {label}:{" "}
                                  {said === "ATTENDING"
                                    ? t.personAttending
                                    : said === "DECLINED"
                                    ? t.personDeclined
                                    : t.personPending}
                                </span>
                              ))}
                              {/* Only somebody staying for the meal eats with us. */}
                              {person.reception === "ATTENDING" && (
                                <span className="opacity-70">
                                  {t.allergies}:{" "}
                                  {person.allergies.trim() || t.noAllergies}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        {g.maxKids > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-0.5">
                              <Icon name="child" className="h-4 w-4 shrink-0" />
                              {t.kidsAllergies}: {t.atChurch} {g.churchKids} · {t.atReception}{" "}
                              {g.kids}
                            </span>
                            {g.kids > 0 && (
                              <span className="opacity-70">
                                {t.allergies}:{" "}
                                {(g.kidsAllergies ?? "").trim() || t.noAllergies}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-4 text-center opacity-60">
                    {t.noGuestsMatch}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DangerZone onDone={() => void load()} />
          </>
        )}
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

// `useAdminLang` reads the `?lang=` query parameter, which requires a Suspense
// boundary above it in the App Router.
export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-black text-xs animate-pulse">…</p>
        </main>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}

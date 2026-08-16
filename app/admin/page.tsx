"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GROUPS, STATUSES } from "@/lib/config";
import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import InviteMessageModal from "@/components/admin/InviteMessageModal";
import DangerZone from "@/components/admin/DangerZone";
import AdminsPanel from "@/components/admin/AdminsPanel";
import AuditPanel from "@/components/admin/AuditPanel";
import VisitsPanel from "@/components/admin/VisitsPanel";
import PasswordChangeGate from "@/components/admin/PasswordChangeGate";
import { copyText } from "@/lib/clipboard";
import { clampParty, headcount, invitedHeadcount } from "@/lib/capacity";
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
import { withLangParam } from "@/lib/langParam";
import AnswerButtons from "@/components/admin/AnswerButtons";
import {
  fetchGuests,
  saveAnswers as putAnswers,
  type AdminGuest as Guest,
} from "@/lib/adminGuests";
import GuestFormModal, {
  emptyGuestForm,
  type GuestFormValues,
} from "@/components/admin/GuestFormModal";

type AdminIdentity = {
  id: string;
  username: string;
  mustChangePassword: boolean;
};

type Tab = "guests" | "visits" | "audit" | "admins" | "account";

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
  /**
   * The guest list as it stands right now, not as it stood when the last render
   * happened. Answering two people in the same breath is normal at a kitchen
   * table, and each answer has to be laid on top of the previous one rather
   * than on top of what the screen happened to show a moment ago.
   */
  const guestsRef = useRef<Guest[]>([]);
  const putGuests = useCallback((next: (prev: Guest[]) => Guest[]) => {
    guestsRef.current = next(guestsRef.current);
    setGuests(guestsRef.current);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSent, setFilterSent] = useState("ALL");
  // The add/edit form lives in a modal: null while it is closed.
  const [guestForm, setGuestForm] = useState<GuestFormValues | null>(null);
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
      const result = await fetchGuests();
      if (!result.ok) {
        if (result.reason === "UNAUTHORIZED") setAdmin(null);
        // Temporary password: the panel is locked to the password screen.
        if (result.reason === "PASSWORD_CHANGE_REQUIRED") {
          setAdmin((a) => (a ? { ...a, mustChangePassword: true } : a));
        }
        if (result.reason === "FAILED") setError(t.couldNotLoad);
        return false;
      }
      putGuests(() => result.guests);
      return true;
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
    putGuests(() => []);
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

  /** Returns true when the household was stored, so the modal can close. */
  async function saveGuest(
    values: GuestFormValues,
    answersChanged: boolean
  ): Promise<boolean> {
    setError(null);
    const res = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || t.couldNotSave);
    }

    // The household has to exist before its people can answer, and the names
    // have to be the new ones: an invitation renamed to add somebody only grows
    // their seat once it is stored. So the answers follow in a second step.
    const saved = (await res.json().catch(() => null))?.guest as Guest | undefined;
    if (answersChanged && saved) {
      await putAnswers({ ...saved, attendees: values.attendees }, values.attendees);
    }

    setGuestForm(null);
    await load();
    return true;
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
    setGuestForm({
      id: g.id,
      guestCode: g.guestCode,
      name: g.name,
      group: g.group,
      status: g.status,
      maxGuests: g.maxGuests,
      maxKids: g.maxKids,
      likely: g.likely,
      inviteSent: g.inviteSent,
      attendees: g.attendees ?? [],
    });
  }

  /**
   * Optimistic toggle: the checkbox flips immediately and reverts if the server
   * refuses, so ticking off 58 invitations doesn't feel like waiting on a queue.
   */
  async function setInviteSent(g: Guest, sent: boolean) {
    putGuests((prev) =>
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

  /**
   * Answers a household's invitation on their behalf — for the replies that
   * arrive by phone, in the schoolyard or at the door. The server recomputes
   * the household from the individual answers, so the numbers in the table can
   * never disagree with the people behind them.
   */
  /** The household as it stands now, whatever the screen was showing. */
  function latest(g: Guest): Guest {
    return guestsRef.current.find((x) => x.id === g.id) ?? g;
  }

  async function saveAnswers(
    guest: Guest,
    people: AttendeeSlot[],
    extra: { churchKids?: number; kids?: number; kidsAllergies?: string } = {}
  ) {
    const g = latest(guest);
    putGuests((prev) =>
      prev.map((x) => (x.id === g.id ? { ...x, ...extra, attendees: people } : x))
    );
    const saved = await putAnswers(g, people, extra);
    if (!saved) {
      setError(t.couldNotSave);
      await load();
      return;
    }
    putGuests((prev) =>
      prev.map((x) =>
        x.id === g.id ? { ...x, ...saved.guest, attendees: saved.attendees } : x
      )
    );
  }

  /**
   * Answers one half of the day for one person, leaving everybody else alone.
   * Pressing the answer somebody already gave takes it back, because an
   * administrator who ticks the wrong box needs a way out of it.
   */
  function answerPart(
    guest: Guest,
    position: number,
    part: "church" | "reception",
    said: string
  ) {
    const g = latest(guest);
    const people = (g.attendees ?? []).map((p) =>
      p.position === position
        ? {
            ...p,
            [part]: said,
            allergies:
              part === "reception" && said !== "ATTENDING" ? "" : p.allergies,
          }
        : p
    );
    void saveAnswers(g, people);
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
    // Who was asked, as opposed to who is coming: every seat on every
    // invitation, so the household count has a number of people beside it.
    const asked = invitedHeadcount(guests);
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
      invitedPeople: asked.total,
      invitedAdults: asked.adults,
      invitedKids: asked.kids,
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
              <Link
                href={withLangParam("/admin/report", lang)}
                className="pixel-btn bg-pastel-blue border-4 border-black py-2 px-3 text-[14px] flex items-center gap-2"
              >
                <Icon name="print" /> {t.report}
              </Link>
            )}
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
              { id: "visits", label: t.menuVisits, icon: "views" },
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

        {tab === "visits" && <VisitsPanel t={t} locale={locale} />}

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
              <Icon name="guests" /> {t.invitedPeople}
            </div>
            <div className="text-xl sm:text-2xl">{metrics.invitedPeople}</div>
            <div className="text-[13px] opacity-70 mt-1">
              {t.adultsKids(metrics.invitedAdults, metrics.invitedKids)}
            </div>
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

        <div className="mb-6">
          <button
            type="button"
            onClick={() => setGuestForm({ ...emptyGuestForm })}
            className="pixel-btn bg-pastel-green border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
          >
            <Icon name="addGuest" /> {t.addGuest}
          </button>
        </div>

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
                        <div className="text-[12px] opacity-70">{t.answerHint}</div>
                        <ul className="flex flex-col gap-2">
                          {people.map((person) => (
                            <li
                              key={person.position}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="min-w-[8rem] font-bold">{person.name}</span>
                              {/* Each half of the day is answered on its own. */}
                              {([
                                ["church", t.atChurch, person.church],
                                ["reception", t.atReception, person.reception],
                              ] as const).map(([part, label, said]) => (
                                <AnswerButtons
                                  key={part}
                                  said={said}
                                  label={label}
                                  attendingText={t.personAttending}
                                  declinedText={t.personDeclined}
                                  pendingText={t.personPending}
                                  title={t.answerFor(person.name)}
                                  onAnswer={(next) =>
                                    answerPart(g, person.position, part, next)
                                  }
                                />
                              ))}
                              {/* Only somebody staying for the meal eats with us. */}
                              {person.reception === "ATTENDING" && (
                                <input
                                  defaultValue={person.allergies}
                                  key={`${person.position}-${person.allergies}`}
                                  placeholder={t.allergyPlaceholder}
                                  aria-label={`${t.allergies} — ${person.name}`}
                                  onBlur={(e) => {
                                    const value = e.target.value.trim();
                                    if (value === person.allergies.trim()) return;
                                    void saveAnswers(
                                      g,
                                      (latest(g).attendees ?? people).map((x) =>
                                        x.position === person.position
                                          ? { ...x, allergies: value }
                                          : x
                                      )
                                    );
                                  }}
                                  className="border-2 border-black px-2 py-0.5 text-[12px] min-w-[10rem]"
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                        {/* Children only mean something once an adult is coming. */}
                        {g.maxKids > 0 &&
                          people.some(
                            (p) => p.church === "ATTENDING" || p.reception === "ATTENDING"
                          ) && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-0.5">
                              <Icon name="child" className="h-4 w-4 shrink-0" />
                              {t.kidsAllergies}
                            </span>
                            {([
                              ["churchKids", t.kidsAtChurch, g.churchKids, "church"],
                              ["kids", t.kidsAtParty, g.kids, "reception"],
                            ] as const)
                              .filter(([, , , part]) =>
                                people.some((p) => p[part] === "ATTENDING")
                              )
                              .map(([field, label, value]) => (
                              <label key={field} className="flex items-center gap-1">
                                {label}
                                <input
                                  type="number"
                                  min={0}
                                  max={g.maxKids}
                                  value={value}
                                  onChange={(e) =>
                                    void saveAnswers(g, latest(g).attendees ?? people, {
                                      [field]: Math.max(
                                        0,
                                        Math.min(g.maxKids, Number(e.target.value) || 0)
                                      ),
                                    })
                                  }
                                  className="border-2 border-black px-2 py-0.5 text-[12px] w-16"
                                />
                              </label>
                              ))}
                            {g.kids > 0 && (
                              <input
                                key={`kids-${g.kidsAllergies}`}
                                defaultValue={g.kidsAllergies ?? ""}
                                placeholder={t.allergyPlaceholder}
                                aria-label={`${t.allergies} — ${t.kidsAllergies}`}
                                onBlur={(e) => {
                                  const value = e.target.value.trim();
                                  if (value === (g.kidsAllergies ?? "").trim()) return;
                                  void saveAnswers(g, latest(g).attendees ?? people, {
                                    kidsAllergies: value,
                                  });
                                }}
                                className="border-2 border-black px-2 py-0.5 text-[12px] min-w-[10rem]"
                              />
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

      {guestForm && (
        <GuestFormModal
          t={t}
          initial={guestForm}
          groups={GROUPS}
          statuses={STATUSES}
          takenCodes={guests
            .filter((x) => x.id !== guestForm.id)
            .map((x) => x.guestCode)}
          onSave={saveGuest}
          onClose={() => setGuestForm(null)}
        />
      )}

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

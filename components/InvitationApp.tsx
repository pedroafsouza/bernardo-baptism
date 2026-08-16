"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import RsvpModal, { type RunResult } from "@/components/RsvpModal";
import IntroOverlay from "@/components/IntroOverlay";
import Icon from "@/components/Icon";
import { useLang } from "@/lib/i18n";
import { computeScore } from "@/lib/config";
import { DEMO_CODE, demoGuest, isDemoCode } from "@/lib/demo";
import { boneDay } from "@/lib/dailyBones";
import { attendeeSlots, type AttendeeSlot } from "@/lib/attendees";
import { createBoneReporter, type BoneReporter } from "@/lib/boneReporter";
import VisitTracker from "@/components/VisitTracker";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="game-root flex items-center justify-center bg-pastel-cream">
      <p className="text-black text-xs animate-pulse">…</p>
    </div>
  ),
});

type Guest = {
  guestCode: string;
  name: string;
  status: string;
  churchCount?: number;
  churchKids?: number;
  guestCount: number;
  kids: number;
  kidsAllergies?: string;
  maxGuests: number;
  maxKids: number;
};

function InvitationInner() {
  const params = useSearchParams();
  const code = params.get("code");
  const { lang, setLang, t, langFromLink } = useLang();
  const [guest, setGuest] = useState<Guest | null>(null);
  // Who is on this invitation and what each of them has already answered.
  const [attendees, setAttendees] = useState<AttendeeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [run, setRun] = useState<RunResult | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  // Which day's bones are on the ground. Fixed for the lifetime of the page, so
  // a run that straddles midnight still hands its bones in to the day it was
  // actually playing.
  const [day] = useState(() => boneDay());
  // Bones this guest already handed in today. Fetched before the level is built
  // so a reload never puts a collected bone back on the ground.
  const [collected, setCollected] = useState<number[] | null>(null);

  // Live progress mirrored out of the game so the run can be scored on arrival.
  const progress = useRef({ blessings: 0, bones: 0 });

  // Bones are queued here and flushed on a 500 ms tick — one request for a
  // handful of treats instead of one request per treat.
  const reporter = useRef<BoneReporter | null>(null);

  useEffect(() => {
    if (!code || collected === null) return;
    const instance = createBoneReporter({ guestCode: code, day, known: collected });
    reporter.current = instance;
    return () => {
      instance.stop();
      reporter.current = null;
    };
  }, [code, day, collected]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!code) {
        setLoading(false);
        return;
      }
      // The demo invitation never touches the database — resolve it locally so
      // it also works when the guest list is empty or unreachable.
      if (isDemoCode(code)) {
        const demo = demoGuest();
        setGuest(demo);
        setAttendees(attendeeSlots(demo));
        setCollected([]);
        setLoading(false);
        return;
      }
      const query = `code=${encodeURIComponent(code)}`;
      const [rsvp, bones] = await Promise.allSettled([
        fetch(`/api/rsvp?${query}`),
        fetch(`/api/bones?${query}&day=${encodeURIComponent(day)}`),
      ]);
      try {
        if (rsvp.status === "fulfilled" && rsvp.value.ok) {
          const data = await rsvp.value.json();
          if (active) {
            setGuest(data.guest);
            setAttendees(
              Array.isArray(data.attendees) ? (data.attendees as AttendeeSlot[]) : []
            );
          }
        }
      } catch {
        /* ignore */
      }
      try {
        const list =
          bones.status === "fulfilled" && bones.value.ok
            ? ((await bones.value.json()).collected as unknown)
            : [];
        if (active) {
          setCollected(Array.isArray(list) ? list.map(Number).filter(Number.isInteger) : []);
        }
      } catch {
        // The day's bones are worth playing for even if we could not ask what
        // was already fetched — the server drops the duplicates anyway.
        if (active) setCollected([]);
      }
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [code, day]);

  const submitRun = useCallback(
    async (finished: boolean) => {
      const { bones, blessings } = progress.current;
      const score = computeScore(bones, blessings, finished);
      // Show the local result immediately; the server decides the stored best.
      setRun({ bones, blessings, finished, score, isBest: false });
      if (!code || score <= 0) return;
      // The bone race is shown right next to the score, so the queue is emptied
      // before the standings are refreshed.
      await reporter.current?.flush();
      try {
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestCode: code, bones, blessings, finished }),
        });
        if (res.ok) {
          const d = await res.json();
          setRun({ bones, blessings, finished, score, isBest: !!d.isBest });
        }
      } catch {
        /* scoring is best-effort — never block the RSVP */
      } finally {
        setLeaderboardKey((k) => k + 1);
      }
    },
    [code]
  );

  const openRsvp = useCallback(
    (finished: boolean) => {
      setShowModal(true);
      void submitRun(finished);
    },
    [submitRun]
  );

  if (!code) {
    return (
      <main className="game-root flex items-center justify-center p-6 text-center">
        <div className="pixel-border bg-white border-4 border-black p-6 max-w-sm text-black">
          <div className="text-3xl mb-3 text-pastel-plum">
            <Icon name="cross" />
          </div>
          <h1 className="text-[19px] leading-relaxed mb-3">{t.noCodeTitle}</h1>
          <p className="text-[14px] leading-relaxed opacity-80">
            {t.noCodeBody} <br />
            <span className="text-pastel-plum">{t.noCodeExample}</span>
          </p>
          <a
            href={`/?code=${DEMO_CODE}`}
            className="pixel-btn mt-5 inline-flex items-center gap-2 bg-pastel-green border-4 border-black py-2 px-4 text-[15px]"
          >
            <Icon name="play" /> {t.demoTry}
          </a>
        </div>
      </main>
    );
  }

  if (loading || collected === null) {
    return (
      <main className="game-root flex items-center justify-center">
        <p className="text-black text-xs animate-pulse flex items-center gap-2">
          <Icon name="spinner" spin /> {t.loadingInvitation}
        </p>
      </main>
    );
  }

  if (!guest) {
    return (
      <main className="game-root flex items-center justify-center p-6 text-center">
        <div className="pixel-border bg-white border-4 border-black p-6 max-w-sm text-black">
          <div className="text-3xl mb-3 text-pastel-plum">
            <Icon name="question" />
          </div>
          <h1 className="text-[19px] leading-relaxed mb-2">{t.notFoundTitle}</h1>
          <p className="text-[14px] leading-relaxed opacity-80">
            {t.notFoundBody(code)}
          </p>
        </div>
      </main>
    );
  }

  const demo = isDemoCode(code);

  return (
    <main className="game-root relative">
      <VisitTracker code={guest.guestCode} lang={lang} />
      <PhaserGame
        key={lang}
        lang={lang}
        day={day}
        collected={collected}
        onEnterChurch={() => openRsvp(true)}
        onBoneCollected={(boneIndex) => reporter.current?.collect(boneIndex)}
        onProgress={(p) => {
          progress.current = p;
        }}
        disabled={showModal || showIntro}
      />

      {!showIntro && !showModal && (
        <button
          onClick={() => openRsvp(false)}
          className="absolute top-3 right-3 z-30 pixel-btn bg-white/90 border-4 border-black text-black text-[14px] px-3 py-2 flex items-center gap-2"
        >
          {t.skip} <Icon name="skip" />
        </button>
      )}

      {demo && !showIntro && !showModal && (
        <span className="absolute top-3 left-3 z-30 bg-pastel-purple text-black border-4 border-black text-[12px] px-2 py-1">
          {t.demoBadge}
        </span>
      )}

      {showIntro && (
        <IntroOverlay
          name={guest.name}
          lang={lang}
          askLanguage={!langFromLink}
          onLangChange={setLang}
          onPlay={() => setShowIntro(false)}
          onSkip={() => {
            setShowIntro(false);
            openRsvp(false);
          }}
        />
      )}

      {showModal && (
        <RsvpModal
          guest={guest}
          attendees={attendees}
          demo={demo}
          lang={lang}
          run={run}
          leaderboardKey={leaderboardKey}
          onSaved={(g, people) => {
            setGuest(g);
            setAttendees(people);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  );
}

export default function InvitationApp() {
  return (
    <Suspense
      fallback={
        <main className="game-root flex items-center justify-center">
          <p className="text-black text-xs animate-pulse">…</p>
        </main>
      }
    >
      <InvitationInner />
    </Suspense>
  );
}

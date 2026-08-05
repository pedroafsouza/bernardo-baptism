"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import RsvpModal, { type RunResult } from "@/components/RsvpModal";
import IntroOverlay from "@/components/IntroOverlay";
import Icon from "@/components/Icon";
import { useLang } from "@/lib/i18n";
import { computeScore } from "@/lib/config";

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
  guestCount: number;
};

function InvitationInner() {
  const params = useSearchParams();
  const code = params.get("code");
  const { lang, setLang, t } = useLang(params.get("lang"));
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [run, setRun] = useState<RunResult | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  // Live progress mirrored out of the game so the run can be scored on arrival.
  const progress = useRef({ blessings: 0, bones: 0 });

  useEffect(() => {
    let active = true;
    async function load() {
      if (!code) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/rsvp?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setGuest(data.guest);
        }
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [code]);

  const submitRun = useCallback(
    async (finished: boolean) => {
      const { bones, blessings } = progress.current;
      const score = computeScore(bones, blessings, finished);
      // Show the local result immediately; the server decides the stored best.
      setRun({ bones, blessings, finished, score, isBest: false });
      if (!code || score <= 0) return;
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
          <div className="text-3xl mb-3 text-pastel-purple">
            <Icon name="cross" />
          </div>
          <h1 className="text-[19px] leading-relaxed mb-3">{t.noCodeTitle}</h1>
          <p className="text-[14px] leading-relaxed opacity-80">
            {t.noCodeBody} <br />
            <span className="text-pastel-purple">{t.noCodeExample}</span>
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
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
          <div className="text-3xl mb-3 text-pastel-purple">
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

  return (
    <main className="game-root relative">
      <PhaserGame
        key={lang}
        lang={lang}
        onEnterChurch={() => openRsvp(true)}
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

      {showIntro && (
        <IntroOverlay
          name={guest.name}
          lang={lang}
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
          lang={lang}
          run={run}
          leaderboardKey={leaderboardKey}
          onSaved={(g) => setGuest(g)}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  );
}

export default function Page() {
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

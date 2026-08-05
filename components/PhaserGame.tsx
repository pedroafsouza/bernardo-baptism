"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createMainScene } from "@/components/game/createMainScene";
import type { Control } from "@/lib/gameConstants";
import Icon from "@/components/Icon";
import { DICTS, type Lang } from "@/lib/i18n";
import { getMusic, readMuted, writeMuted } from "@/lib/music";

type Props = {
  onEnterChurch: () => void;
  onProgress?: (p: { blessings: number; bones: number }) => void;
  lang: Lang;
  disabled?: boolean;
};

export default function PhaserGame({
  onEnterChurch,
  onProgress,
  lang,
  disabled,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const ctrl = useRef<Control>({ left: false, right: false, jump: false, paused: false });
  const [blessings, setBlessings] = useState(0);
  const [coins, setCoins] = useState(0);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);

  const t = DICTS[lang];

  const onEnterRef = useRef(onEnterChurch);
  onEnterRef.current = onEnterChurch;

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    onProgressRef.current?.({ blessings, bones: coins });
  }, [blessings, coins]);

  // Reflect modal state into the paused flag.
  useEffect(() => {
    ctrl.current.paused = !!disabled;
  }, [disabled]);

  // Background music: autoplay needs a gesture, so it starts on the first
  // interaction with the game and respects the guest's saved mute preference.
  useEffect(() => {
    const music = getMusic();
    if (!music) return;
    const wantsMuted = readMuted();
    setMuted(wantsMuted);
    if (wantsMuted) return;

    const kick = () => {
      void music.start();
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    void music.start();

    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
      music.stop();
    };
  }, []);

  const toggleMusic = useCallback(() => {
    const music = getMusic();
    if (!music) return;
    const nowPlaying = music.toggle();
    setMuted(!nowPlaying);
    writeMuted(!nowPlaying);
  }, []);

  useEffect(() => {
    let destroyed = false;
    let game: any;

    (async () => {
      const Phaser = (await import("phaser")).default;
      // Canvas text is rasterised once, so the webfont must be ready before the
      // scene draws — otherwise the in-world text stays in the fallback face.
      try {
        await document.fonts.load('16px "Pixelify Sans"');
        await document.fonts.ready;
      } catch {
        /* fonts are best-effort — never block the game */
      }
      if (destroyed || !containerRef.current) return;
      const control = ctrl.current;

      const MainScene = createMainScene(Phaser, {
        control,
        setBlessings,
        setCoins,
        setReady,
        onEnterRef,
        lang,
      });

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#bfe3ff",
        pixelArt: true,
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: "100%",
          height: "100%",
        },
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 1500 }, debug: false },
        },
        scene: [MainScene],
      });

      gameRef.current = game;
    })();

    return () => {
      destroyed = true;
      if (game) game.destroy(true);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- touch controls ----
  const set = useCallback((k: keyof Control, v: boolean) => {
    ctrl.current[k] = v;
  }, []);

  const holdBtn = (k: keyof Control, label: React.ReactNode, extra = "") => (
    <button
      aria-label={k}
      className={`select-none pixel-btn flex items-center justify-center border-4 border-black text-black active:brightness-90 ${extra}`}
      onPointerDown={(e) => {
        e.preventDefault();
        set(k, true);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        set(k, false);
      }}
      onPointerLeave={() => set(k, false)}
      onPointerCancel={() => set(k, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  return (
    <div
      className="game-root relative bg-pastel-blue"
      onPointerDown={() => {
        const c = gameRef.current?.canvas as HTMLCanvasElement | undefined;
        if (c) c.focus();
      }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* HUD */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-white/90 border-4 border-black px-3 py-2 text-[16px] sm:text-[18px] text-black flex gap-4">
          <span className="flex items-center gap-1.5">
            <Icon name="cross" className="text-pastel-purple" /> {blessings}/3
          </span>
          <span className="flex items-center gap-1.5" title={t.bonesTooltip}>
            <Icon name="bone" /> {coins}
          </span>
        </div>
      </div>

      {/* Music toggle */}
      <button
        onClick={toggleMusic}
        aria-label={muted ? t.musicOff : t.musicOn}
        title={muted ? t.musicOff : t.musicOn}
        className="absolute top-3 left-3 z-20 pixel-btn bg-white/90 border-4 border-black text-black w-10 h-10 flex items-center justify-center text-[17px]"
      >
        <Icon name={muted ? "muted" : "music"} />
      </button>

      {!ready && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-pastel-blue">
          <p className="text-black text-xs animate-pulse flex items-center gap-2">
            <Icon name="spinner" spin /> {t.loadingWorld}
          </p>
        </div>
      )}

      {/* Left/Right pad */}
      <div
        className={`absolute bottom-6 left-4 z-20 flex gap-2 ${
          disabled ? "opacity-30 pointer-events-none" : ""
        }`}
        style={{ touchAction: "none" }}
      >
        {holdBtn("left", <Icon name="left" />, "w-16 h-16 bg-pastel-cream")}
        {holdBtn("right", <Icon name="right" />, "w-16 h-16 bg-pastel-cream")}
      </div>

      {/* Jump */}
      <div
        className={`absolute bottom-6 right-4 z-20 ${
          disabled ? "opacity-30 pointer-events-none" : ""
        }`}
        style={{ touchAction: "none" }}
      >
        {holdBtn(
          "jump",
          <span className="flex flex-col items-center gap-0.5 text-[16px]">
            <Icon name="up" />
            HOP
          </span>,
          "w-20 h-20 bg-pastel-green rounded-full"
        )}
      </div>
    </div>
  );
}

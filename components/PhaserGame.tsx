"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createMainScene } from "@/components/game/createMainScene";
import type { Control } from "@/lib/gameConstants";
import Icon from "@/components/Icon";
import { DICTS, type Lang } from "@/lib/i18n";
import { getMusic, readMuted, writeMuted } from "@/lib/music";

type Props = {
  onEnterChurch: () => void;
  onProgress?: (p: { blessings: number; bones: number }) => void;
  /** Index of a daily bone the moment it is picked up. */
  onBoneCollected?: (boneIndex: number) => void;
  /** The day whose bone layout to build, `YYYY-MM-DD`. */
  day?: string;
  /** Bones this guest already handed in today — left out of the level. */
  collected?: number[];
  lang: Lang;
  disabled?: boolean;
};

export default function PhaserGame({
  onEnterChurch,
  onProgress,
  onBoneCollected,
  day,
  collected,
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

  // The scene is built once, so the callback reaches it through a ref that the
  // React tree is free to replace on every render.
  const onBoneRef = useRef<(boneIndex: number) => void>(() => {});
  onBoneRef.current = onBoneCollected ?? (() => {});

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
    let resizeObs: ResizeObserver | undefined;

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
        onBoneRef,
        day,
        collected,
        lang,
      });

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#bfe3ff",
        pixelArt: true,
        roundPixels: true,
        // The intro banner, Phaser's audio stack (music is handled by
        // lib/music) and gamepad polling are all dead weight here.
        banner: false,
        audio: { noAudio: true },
        disableContextMenu: true,
        input: { keyboard: true, mouse: true, touch: true, gamepad: false },
        render: { powerPreference: "high-performance" },
        // Clamp the simulation step: a backgrounded tab that resumes with a
        // huge delta used to teleport Bernardo through the floor.
        fps: { target: 60, min: 30, smoothStep: true },
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

      // `Phaser.Scale.RESIZE` only re-measures the parent on a slow poll, and it
      // then overwrites the size with the value it cached on the previous tick —
      // so the canvas lagged a resize behind its container. This canvas is sized
      // by `100dvh`, which changes without a window resize event (a mobile
      // toolbar sliding away, a panel drag, a font-driven reflow), and the stale
      // canvas was what left a band of page background above the sky. Observing
      // the container and forcing a `refresh()` right after the resize makes the
      // new size stick instead of being reverted.
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        const ro = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          if (width <= 0 || height <= 0) return;
          game.scale.resize(width, height);
          game.scale.refresh();
        });
        ro.observe(containerRef.current);
        resizeObs = ro;
      }
    })();

    return () => {
      destroyed = true;
      resizeObs?.disconnect();
      if (game) game.destroy(true);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- touch controls ----
  // Which button each live finger/mouse pointer is currently holding. A touch
  // implicitly captures its start target, so sliding a thumb from RIGHT to LEFT
  // never fires leave/enter on the buttons themselves — the old code left RIGHT
  // stuck down. We release that capture and route every pointer through this map
  // so a key is only held while some pointer is actually on top of it.
  const held = useRef<Map<number, keyof Control>>(new Map());

  const press = useCallback((id: number, k: keyof Control) => {
    const prev = held.current.get(id);
    if (prev === k) return;
    if (prev) ctrl.current[prev] = false;
    held.current.set(id, k);
    ctrl.current[k] = true;
  }, []);

  const release = useCallback((id: number) => {
    const prev = held.current.get(id);
    if (!prev) return;
    held.current.delete(id);
    // another finger may still be resting on the same button
    let stillHeld = false;
    held.current.forEach((k) => {
      if (k === prev) stillHeld = true;
    });
    if (!stillHeld) ctrl.current[prev] = false;
  }, []);

  // A finger lifted outside the pad (or a cancelled gesture) never reaches the
  // button, so the window is the only reliable place to clear it.
  useEffect(() => {
    const clear = (e: PointerEvent) => release(e.pointerId);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, [release]);

  // The pad is hidden/disabled mid-hold when a modal opens — drop every key.
  useEffect(() => {
    if (!disabled) return;
    held.current.clear();
    ctrl.current.left = false;
    ctrl.current.right = false;
    ctrl.current.jump = false;
  }, [disabled]);

  const holdBtn = useCallback(
    (k: keyof Control, label: React.ReactNode, extra = "") => (
      <button
        aria-label={k}
        className={`select-none pixel-btn flex items-center justify-center border-4 border-black text-black active:brightness-90 ${extra}`}
        onPointerDown={(e) => {
          e.preventDefault();
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          press(e.pointerId, k);
        }}
        onPointerEnter={(e) => {
          // sliding onto this button with the finger/mouse still down
          if (e.pointerType === "touch" || e.buttons > 0) {
            press(e.pointerId, k);
          }
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          release(e.pointerId);
        }}
        onPointerLeave={(e) => release(e.pointerId)}
        onPointerCancel={(e) => release(e.pointerId)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {label}
      </button>
    ),
    [press, release]
  );

  // Every bone Bernardo grabs bumps `coins`, which re-renders this component.
  // The d-pad and the music button don't depend on the score, so memoising them
  // keeps those repaints to the two HUD counters instead of the whole overlay.
  const touchControls = useMemo(
    () => (
      <>
        <div
          className={`absolute bottom-6 left-4 z-20 flex gap-2 ${
            disabled ? "opacity-30 pointer-events-none" : ""
          }`}
          style={{ touchAction: "none" }}
        >
          {holdBtn("left", <Icon name="left" />, "w-16 h-16 bg-pastel-cream")}
          {holdBtn("right", <Icon name="right" />, "w-16 h-16 bg-pastel-cream")}
        </div>

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
      </>
    ),
    [disabled, holdBtn]
  );

  const musicButton = useMemo(
    () => (
      <button
        onClick={toggleMusic}
        aria-label={muted ? t.musicOff : t.musicOn}
        title={muted ? t.musicOff : t.musicOn}
        className="absolute top-3 left-3 z-20 pixel-btn bg-white/90 border-4 border-black text-black w-10 h-10 flex items-center justify-center text-[17px]"
      >
        <Icon name={muted ? "muted" : "music"} />
      </button>
    ),
    [muted, toggleMusic, t.musicOff, t.musicOn]
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
            <Icon name="cross" className="text-pastel-plum" /> {blessings}/3
          </span>
          <span className="flex items-center gap-1.5" title={t.bonesTooltip}>
            <Icon name="bone" /> {coins}
          </span>
        </div>
      </div>

      {musicButton}

      {!ready && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-pastel-blue">
          <p className="text-black text-xs animate-pulse flex items-center gap-2">
            <Icon name="spinner" spin /> {t.loadingWorld}
          </p>
        </div>
      )}

      {touchControls}
    </div>
  );
}

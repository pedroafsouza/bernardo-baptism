"use client";

/**
 * Oscar — Bernardo's loyal little Bichon, rendered straight from the same
 * pixel-art sprite sheet the game uses (`/assets/game/oscar.png`) so the UI and
 * the game always show the exact same dog.
 *
 * Sheet layout: 8 columns of 64x52 cells. Frame index reference:
 *   0-1 stand · 2-7 walk · 8-9 facing camera · 10-13 run · 14 turn
 *   15-16 jump · 17 fall · 18 land · 19-20 play bow · 21 bark
 *   22-23 hurt · 24-25 tumble · 26 cheer · 27-28 sit
 */
export const OSCAR_SHEET = "/assets/game/oscar.png";
export const OSCAR_FRAME_W = 64;
export const OSCAR_FRAME_H = 52;
const OSCAR_COLS = 8;

function framePos(frame: number) {
  const col = frame % OSCAR_COLS;
  const row = Math.floor(frame / OSCAR_COLS);
  return `-${col * OSCAR_FRAME_W}px -${row * OSCAR_FRAME_H}px`;
}

export function OscarAvatar({
  size = 56,
  frame = 27,
  animated = true,
}: {
  size?: number;
  /** Sprite-sheet frame to show (defaults to Oscar sitting). */
  frame?: number;
  /** Sitting idle loop (tail wag / little bark) — only for the default frame. */
  animated?: boolean;
}) {
  const scale = size / OSCAR_FRAME_W;
  const idle = animated && frame === 27;
  return (
    <div
      role="img"
      aria-label="Oscar the dog"
      style={{
        width: size,
        height: OSCAR_FRAME_H * scale,
        overflow: "hidden",
      }}
    >
      <div
        className={idle ? "oscar-sit-idle" : undefined}
        style={{
          width: OSCAR_FRAME_W,
          height: OSCAR_FRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundImage: `url(${OSCAR_SHEET})`,
          backgroundPosition: framePos(frame),
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

/** Small speech-bubble line introduced by Oscar. */
export function OscarSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <div className="shrink-0">
        <OscarAvatar size={52} />
      </div>
      <div className="relative bg-white border-2 border-black px-3 py-2 text-[13px] leading-relaxed text-black">
        <span className="absolute -left-[7px] top-3 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-black" />
        <span className="absolute -left-[4px] top-3 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-white" />
        {children}
      </div>
    </div>
  );
}

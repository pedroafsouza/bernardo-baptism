"use client";

/**
 * Bernardo — the hero of the invitation, drawn from the same sprite sheet the
 * game uses (`/assets/game/bernardo.png`), so the bear who greets you in the
 * overlay is exactly the bear you then run around as.
 *
 * Sheet layout: 9 columns of 56x60 cells (0-1 idle · 2-7 walk · 8 jump).
 */
export const BERNARDO_SHEET = "/assets/game/bernardo.png";
export const BERNARDO_FRAME_W = 56;
export const BERNARDO_FRAME_H = 60;
const BERNARDO_COLS = 9;

function framePos(frame: number) {
  const col = frame % BERNARDO_COLS;
  const row = Math.floor(frame / BERNARDO_COLS);
  return `-${col * BERNARDO_FRAME_W}px -${row * BERNARDO_FRAME_H}px`;
}

export function BernardoAvatar({ size = 56, frame = 0 }: { size?: number; frame?: number }) {
  const scale = size / BERNARDO_FRAME_W;
  return (
    <div
      role="img"
      aria-label="Bernardo the bear"
      style={{ width: size, height: BERNARDO_FRAME_H * scale, overflow: "hidden" }}
    >
      <div
        style={{
          width: BERNARDO_FRAME_W,
          height: BERNARDO_FRAME_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundImage: `url(${BERNARDO_SHEET})`,
          backgroundPosition: framePos(frame),
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

/** Speech bubble spoken by Bernardo — the counterpart of `OscarSays`. */
export function BernardoSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-left">
      <div className="shrink-0">
        <BernardoAvatar size={48} />
      </div>
      <div className="relative bg-white border-2 border-black px-3.5 py-2.5 text-[13px] leading-relaxed text-black">
        <span className="absolute -left-[7px] top-3 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-black" />
        <span className="absolute -left-[4px] top-3 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-white" />
        {children}
      </div>
    </div>
  );
}

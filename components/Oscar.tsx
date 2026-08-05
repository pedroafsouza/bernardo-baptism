"use client";

/** Oscar — Bernardo's loyal little white Bichon, drawn as crisp pixel-art SVG. */
export function OscarAvatar({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
      aria-label="Oscar the dog"
    >
      {/* fluffy body */}
      <circle cx="16" cy="21" r="8" fill="#ffffff" stroke="#d9d2c4" strokeWidth="1" />
      {/* ears */}
      <circle cx="7" cy="13" r="4.2" fill="#f4efe6" stroke="#d9d2c4" strokeWidth="1" />
      <circle cx="25" cy="13" r="4.2" fill="#f4efe6" stroke="#d9d2c4" strokeWidth="1" />
      {/* head */}
      <circle cx="16" cy="12" r="8" fill="#ffffff" stroke="#d9d2c4" strokeWidth="1" />
      {/* cheeks fluff */}
      <circle cx="9" cy="15" r="3" fill="#ffffff" />
      <circle cx="23" cy="15" r="3" fill="#ffffff" />
      {/* eyes */}
      <circle cx="12.5" cy="11" r="1.5" fill="#2a2320" />
      <circle cx="19.5" cy="11" r="1.5" fill="#2a2320" />
      <circle cx="13" cy="10.5" r="0.5" fill="#fff" />
      <circle cx="20" cy="10.5" r="0.5" fill="#fff" />
      {/* snout + nose */}
      <ellipse cx="16" cy="15" rx="3.2" ry="2.4" fill="#faf6ef" />
      <ellipse cx="16" cy="14" rx="1.6" ry="1.2" fill="#2a2320" />
      <path d="M16 15 v1.6 M16 16.6 l-1.6 0.8 M16 16.6 l1.6 0.8" stroke="#2a2320" strokeWidth="0.7" fill="none" />
      {/* red bow (matches Bernardo's cape) */}
      <path d="M13 20 l-3 -1.6 v3.2 z" fill="#d23b3b" />
      <path d="M19 20 l3 -1.6 v3.2 z" fill="#d23b3b" />
      <circle cx="16" cy="20" r="1.3" fill="#a82a2a" />
    </svg>
  );
}

/** Small speech-bubble line introduced by Oscar. */
export function OscarSays({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-left">
      <div className="shrink-0">
        <OscarAvatar size={44} />
      </div>
      <div className="relative bg-white border-2 border-black px-3 py-2 text-[8px] leading-relaxed text-black">
        <span className="absolute -left-[7px] top-3 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-black" />
        <span className="absolute -left-[4px] top-3 w-0 h-0 border-y-[6px] border-y-transparent border-r-[7px] border-r-white" />
        {children}
      </div>
    </div>
  );
}

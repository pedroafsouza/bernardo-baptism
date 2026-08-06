"use client";

/**
 * Handing bones in.
 *
 * A good run picks up a bone every second or so, sometimes several at once, and
 * one request per bone would be both wasteful and easy to mistake for a flood.
 * So pickups are queued and flushed on a fixed 500 ms tick, and only when there
 * is actually something to send — an idle game makes no requests at all.
 *
 * Everything here is best-effort by design: a failed flush puts its bones back
 * in the queue and the next tick tries again, and because the server keys on
 * (guest, day, bone) a bone that arrives twice is simply ignored.
 */

export const BONE_FLUSH_MS = 500;

/** Never let a queue grow without bound if the network is down for a long time. */
const MAX_QUEUE = 512;

export type BoneReporter = {
  /** Queue one collected bone by its index in the day's layout. */
  collect: (boneIndex: number) => void;
  /** Send whatever is queued right now. */
  flush: () => Promise<void>;
  /** Stop the ticker and make a final attempt to hand in what is left. */
  stop: () => void;
};

type Options = {
  guestCode: string;
  day: string;
  /** Called after a successful flush with the standings for this guest. */
  onSynced?: (result: { today: number; total: number }) => void;
  /** Bones already on record for this guest today — never sent again. */
  known?: number[];
  intervalMs?: number;
};

export function createBoneReporter({
  guestCode,
  day,
  onSynced,
  known = [],
  intervalMs = BONE_FLUSH_MS,
}: Options): BoneReporter {
  // A Set, so the same bone queued twice (a double overlap, a retry) is one
  // entry, and bones already accepted are never re-sent.
  let pending = new Set<number>();
  const sent = new Set<number>(known);
  let inFlight = false;
  let stopped = false;

  async function flush(): Promise<void> {
    if (stopped && pending.size === 0) return;
    if (inFlight || pending.size === 0) return;

    const batch = [...pending];
    pending = new Set();
    inFlight = true;

    try {
      const res = await fetch("/api/bones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestCode, day, bones: batch }),
        keepalive: true,
      });
      if (!res.ok) throw new Error(`bones: ${res.status}`);
      const data = await res.json();
      batch.forEach((i) => sent.add(i));
      onSynced?.({ today: Number(data.today) || 0, total: Number(data.total) || 0 });
    } catch {
      // Put them back — the next tick will try again.
      batch.forEach((i) => pending.add(i));
    } finally {
      inFlight = false;
    }
  }

  const timer = setInterval(() => {
    void flush();
  }, intervalMs);

  // A guest who closes the tab mid-run should still get their last bones.
  const onHide = () => {
    if (document.visibilityState === "hidden") void flush();
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
  }

  return {
    collect(boneIndex: number) {
      if (stopped) return;
      if (!Number.isInteger(boneIndex) || boneIndex < 0) return;
      if (sent.has(boneIndex) || pending.has(boneIndex)) return;
      if (pending.size >= MAX_QUEUE) return;
      pending.add(boneIndex);
    },
    flush,
    stop() {
      stopped = true;
      clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", onHide);
      }
      void flush();
    },
  };
}

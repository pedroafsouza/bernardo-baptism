/**
 * The on-screen d-pad's bookkeeping, kept away from React so it can be tested
 * without a browser.
 *
 * A touch implicitly captures the element it started on, so sliding a thumb
 * from RIGHT to LEFT never fires leave/enter on the buttons themselves and the
 * first button stays stuck down. The pad releases that capture and routes every
 * pointer through here instead, which means this module — not the DOM — decides
 * when a key is down.
 *
 * The state is `button -> the pointers currently on it`, not `pointer -> its
 * button`. Two thumbs (or a thumb and a mouse) may rest on the same button, and
 * the key must survive one of them lifting: it is down while *any* pointer is
 * on it. Tracking it the other way round meant a finger sliding off RIGHT
 * cleared the key even when a second finger was still holding it, which is what
 * made "run and jump" drop the run mid-stride.
 *
 * A pointer is one physical finger, so it can only ever be on one button:
 * `press` moves it rather than adding to a second set. That keeps the state
 * consistent even when the browser delivers `pointerenter` on the new button
 * before `pointerleave` on the old one.
 */

export type HoldKey = "left" | "right" | "jump";

export const HOLD_KEYS: readonly HoldKey[] = ["left", "right", "jump"];

/** Told whenever a key's down/up state actually changes. */
export type HoldSink = (key: HoldKey, down: boolean) => void;

export type TouchHolds = {
  /** A pointer went down on, or slid onto, `key`. */
  press: (pointerId: number, key: HoldKey) => void;
  /** A pointer left `key` but may still be alive on another one. */
  releaseFrom: (pointerId: number, key: HoldKey) => void;
  /** A pointer is gone (lifted or cancelled) — drop it everywhere. */
  release: (pointerId: number) => void;
  /** The pad went away mid-hold (a modal opened) — drop every key. */
  clear: () => void;
  /** Whether `key` is currently held by at least one pointer. */
  isDown: (key: HoldKey) => boolean;
};

export function createTouchHolds(sink: HoldSink): TouchHolds {
  const held = new Map<HoldKey, Set<number>>();

  const isDown = (key: HoldKey) => (held.get(key)?.size ?? 0) > 0;

  /** Returns true when the key was down and this drop let it go. */
  const drop = (pointerId: number, key: HoldKey) => {
    const pointers = held.get(key);
    if (!pointers?.delete(pointerId)) return false;
    if (pointers.size > 0) return false;
    held.delete(key);
    sink(key, false);
    return true;
  };

  return {
    press(pointerId, key) {
      // One finger, one button: leaving the pointer behind on its previous
      // button would hold that key down for as long as the finger lived.
      held.forEach((pointers, other) => {
        if (other !== key && pointers.has(pointerId)) drop(pointerId, other);
      });

      let pointers = held.get(key);
      if (!pointers) {
        pointers = new Set();
        held.set(key, pointers);
      }
      if (pointers.has(pointerId)) return;
      const wasDown = pointers.size > 0;
      pointers.add(pointerId);
      if (!wasDown) sink(key, true);
    },

    releaseFrom(pointerId, key) {
      drop(pointerId, key);
    },

    release(pointerId) {
      held.forEach((_pointers, key) => drop(pointerId, key));
    },

    clear() {
      const downKeys = Array.from(held.keys());
      held.clear();
      for (const key of downKeys) sink(key, false);
    }

    isDown,
  };
}

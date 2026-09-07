import test from "node:test";
import assert from "node:assert/strict";
import { createTouchHolds, type HoldKey } from "../lib/touchInput";

function pad() {
  const state: Record<HoldKey, boolean> = { left: false, right: false, jump: false };
  const holds = createTouchHolds((k, down) => {
    state[k] = down;
  });
  return { state, holds };
}

test("a press holds the key and lifting the finger drops it", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  assert.equal(state.right, true);
  holds.release(1);
  assert.equal(state.right, false);
});

test("two fingers on different buttons do not disturb each other", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  holds.press(2, "jump");
  assert.deepEqual(state, { left: false, right: true, jump: true });

  holds.release(2);
  assert.deepEqual(state, { left: false, right: true, jump: false });
});

test("a second finger on the same button keeps it down when the first lifts", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  holds.press(2, "right");
  holds.release(1);
  assert.equal(state.right, true);
  holds.release(2);
  assert.equal(state.right, false);
});

test("sliding a finger off a shared button leaves the other finger holding it", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  holds.press(2, "right");

  // finger 1 slides onto LEFT: RIGHT is still under finger 2
  holds.releaseFrom(1, "right");
  holds.press(1, "left");
  assert.deepEqual(state, { left: true, right: true, jump: false });
});

test("a finger moving between buttons only ever holds the newest one", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  holds.press(1, "left");
  assert.deepEqual(state, { left: true, right: false, jump: false });
});

test("enter arriving before leave still ends up on the new button", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  // browser delivers pointerenter on LEFT before pointerleave on RIGHT
  holds.press(1, "left");
  holds.releaseFrom(1, "right");
  assert.deepEqual(state, { left: true, right: false, jump: false });
});

test("leaving a button a pointer never held changes nothing", () => {
  const { state, holds } = pad();
  holds.press(1, "jump");
  holds.releaseFrom(2, "jump");
  assert.equal(state.jump, true);
});

test("pressing the same button twice with one pointer is a no-op", () => {
  const { state, holds } = pad();
  holds.press(1, "jump");
  holds.press(1, "jump");
  holds.release(1);
  assert.equal(state.jump, false);
});

test("clear drops every key at once", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  holds.press(2, "jump");
  holds.clear();
  assert.deepEqual(state, { left: false, right: false, jump: false });
  assert.equal(holds.isDown("right"), false);

  // a stale lift after the pad went away must not resurrect anything
  holds.release(1);
  assert.deepEqual(state, { left: false, right: false, jump: false });
});

test("run and jump survives the thumbs swapping buttons", () => {
  const { state, holds } = pad();
  holds.press(1, "right");
  holds.press(2, "jump");

  // the jumping thumb wanders onto RIGHT and back
  holds.releaseFrom(2, "jump");
  holds.press(2, "right");
  assert.deepEqual(state, { left: false, right: true, jump: false });

  holds.releaseFrom(2, "right");
  holds.press(2, "jump");
  assert.deepEqual(state, { left: false, right: true, jump: true });
});

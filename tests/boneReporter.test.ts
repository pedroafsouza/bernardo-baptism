import test from "node:test";
import assert from "node:assert/strict";
import { createBoneReporter } from "@/lib/boneReporter";

type Call = { bones: number[] };

function stubFetch(behaviour: (call: Call) => { ok: boolean } = () => ({ ok: true })) {
  const calls: Call[] = [];
  (globalThis as any).fetch = async (_url: string, init: any) => {
    const call = JSON.parse(init.body) as Call;
    calls.push(call);
    const { ok } = behaviour(call);
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => ({ ok, today: 0, total: 0 }),
    };
  };
  return calls;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("an idle game sends nothing at all", async () => {
  const calls = stubFetch();
  const reporter = createBoneReporter({ guestCode: "TEST", day: "2026-08-06", intervalMs: 20 });
  await wait(120);
  reporter.stop();
  assert.equal(calls.length, 0, "a tick with an empty queue must not fire a request");
});

test("bones collected between two ticks travel in one request", async () => {
  const calls = stubFetch();
  const reporter = createBoneReporter({ guestCode: "TEST", day: "2026-08-06", intervalMs: 30 });
  [3, 7, 11, 4].forEach((i) => reporter.collect(i));
  await wait(90);
  reporter.stop();
  assert.equal(calls.length, 1);
  assert.deepEqual([...calls[0].bones].sort((a, b) => a - b), [3, 4, 7, 11]);
});

test("bones already on record are never sent again", async () => {
  const calls = stubFetch();
  const reporter = createBoneReporter({
    guestCode: "TEST",
    day: "2026-08-06",
    known: [1, 2, 3],
    intervalMs: 20,
  });
  [1, 2, 3].forEach((i) => reporter.collect(i));
  await wait(80);
  assert.equal(calls.length, 0, "a reload must not re-report what was already handed in");
  reporter.collect(9);
  await wait(60);
  reporter.stop();
  assert.deepEqual(calls.map((c) => c.bones), [[9]]);
});

test("the same bone picked up twice is only reported once", async () => {
  const calls = stubFetch();
  const reporter = createBoneReporter({ guestCode: "TEST", day: "2026-08-06", intervalMs: 20 });
  reporter.collect(5);
  await wait(60);
  reporter.collect(5);
  await wait(60);
  reporter.stop();
  assert.deepEqual(calls.map((c) => c.bones), [[5]]);
});

test("a failed hand-in is retried with the next batch, not lost", async () => {
  let first = true;
  const calls = stubFetch(() => {
    const ok = !first;
    first = false;
    return { ok };
  });
  const reporter = createBoneReporter({ guestCode: "TEST", day: "2026-08-06", intervalMs: 25 });
  reporter.collect(2);
  reporter.collect(8);
  await wait(120);
  reporter.stop();
  assert.equal(calls.length, 2, "the batch is tried again on the next tick");
  assert.deepEqual([...calls[0].bones].sort((a, b) => a - b), [2, 8]);
  assert.deepEqual([...calls[1].bones].sort((a, b) => a - b), [2, 8]);
});

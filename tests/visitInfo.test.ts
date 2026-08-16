import test from "node:test";
import assert from "node:assert/strict";
import { referrerHost, visitFacts } from "@/lib/visitInfo";

const request = (headers: Record<string, string>) =>
  new Request("https://example.test/", { headers });

const facts = (ua: string, extra: Record<string, string> = {}) =>
  visitFacts(request({ "user-agent": ua, ...extra }));

test("an invitation opened inside WhatsApp is not mistaken for Safari", () => {
  const seen = facts(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.24"
  );
  assert.equal(seen.browser, "WhatsApp");
  assert.equal(seen.os, "iOS");
  assert.equal(seen.device, "Phone");
});

test("a browser that claims to be everything is read in the right order", () => {
  assert.equal(
    facts(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 Edg/120"
    ).browser,
    "Edge"
  );
  assert.equal(
    facts(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    ).browser,
    "Chrome"
  );
  assert.equal(
    facts(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15"
    ).browser,
    "Safari"
  );
});

test("a web view without a browser token is still recognised as one", () => {
  assert.equal(
    facts("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)")
      .browser,
    "In-app browser"
  );
});

test("the country comes from the edge, or is honestly unknown", () => {
  assert.equal(facts("x", { "x-vercel-ip-country": "dk" }).country, "DK");
  assert.equal(facts("x", { "cf-ipcountry": "BR" }).country, "BR");
  assert.equal(facts("x", { "cf-ipcountry": "XXX" }).country, "??");
  assert.equal(facts("x").country, "??");
});

test("the same visitor is one visitor, and no address is kept", () => {
  const headers = { "user-agent": "Chrome/120", "x-forwarded-for": "203.0.113.9" };
  const first = visitFacts(request(headers));
  const second = visitFacts(request(headers));
  assert.equal(first.visitorId, second.visitorId);
  assert.equal(first.visitorId.length, 32);
  assert.ok(!first.visitorId.includes("203.0.113.9"));
  assert.notEqual(
    visitFacts(request({ ...headers, "x-forwarded-for": "203.0.113.10" })).visitorId,
    first.visitorId
  );
});

test("only the source of a link is kept, never the whole address", () => {
  assert.equal(referrerHost("https://www.wa.me/chat?id=secret"), "wa.me");
  assert.equal(referrerHost("not a url"), "");
  assert.equal(referrerHost(undefined), "");
});

/**
 * Reading a visit from the request itself.
 *
 * The hosts want to know whether their invitations are being opened and where
 * from; nobody wants a tracker. So the only things taken from a visit are the
 * ones already written on the envelope — the browser's own description of
 * itself and the country the hosting edge attaches — plus a hash that lasts a
 * day. No address is ever stored, and yesterday's visitors cannot be matched
 * against today's.
 */
import { createHash } from "node:crypto";
import { clientIp, userAgent } from "@/lib/security";

export type VisitFacts = {
  country: string;
  browser: string;
  os: string;
  device: string;
  visitorId: string;
};

/**
 * Order matters: Edge says "Chrome" about itself, and Chrome says "Safari".
 *
 * The in-app browsers come first, because most of these invitations are opened
 * by tapping a link inside WhatsApp or Instagram rather than in a browser
 * anybody chose — and that is worth knowing when a link misbehaves.
 */
const BROWSERS: [RegExp, string][] = [
  [/\bWhatsApp\b/i, "WhatsApp"],
  [/\bInstagram\b/i, "Instagram"],
  [/\bFBAN\/|\bFBAV\/|\bFB_IAB\b/i, "Facebook"],
  [/\bMessenger\b/i, "Messenger"],
  [/\bEdg[eA]?\//i, "Edge"],
  [/\bOPR\/|\bOpera\//i, "Opera"],
  [/\bSamsungBrowser\//i, "Samsung Internet"],
  [/\bFxiOS\/|\bFirefox\//i, "Firefox"],
  [/\bCriOS\//i, "Chrome"],
  [/\bChrome\//i, "Chrome"],
  [/\bSafari\//i, "Safari"],
  // A web view with no browser token of its own: an app showing a page.
  [/\bAppleWebKit\/|\bGecko\//i, "In-app browser"],
];

const SYSTEMS: [RegExp, string][] = [
  [/\biPhone\b|\biPad\b|\biPod\b/i, "iOS"],
  [/\bAndroid\b/i, "Android"],
  [/\bWindows\b/i, "Windows"],
  [/\bMac OS X\b|\bMacintosh\b/i, "macOS"],
  [/\bCrOS\b/i, "ChromeOS"],
  [/\bLinux\b/i, "Linux"],
];

function match(pairs: [RegExp, string][], ua: string): string {
  for (const [pattern, name] of pairs) if (pattern.test(ua)) return name;
  return "Unknown";
}

function deviceOf(ua: string): string {
  if (/\biPad\b|\bTablet\b/i.test(ua)) return "Tablet";
  if (/\bMobi|\biPhone\b|\bAndroid\b/i.test(ua)) return "Phone";
  if (!ua.trim()) return "Unknown";
  return "Desktop";
}

/**
 * The country the platform already knows. Vercel, Cloudflare and Fly all put it
 * on the request; in development nobody does, and "??" is an honest answer.
 */
function countryOf(req: Request): string {
  const headers = ["x-vercel-ip-country", "cf-ipcountry", "fly-client-country", "x-country"];
  for (const name of headers) {
    const value = req.headers.get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value)) return value;
  }
  return "??";
}

/**
 * Same person, same day, same device — one visitor. The salt is the date, so
 * the hash stops being a handle on anybody the moment the day turns.
 */
function visitorOf(req: Request, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${day}|${clientIp(req)}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

export function visitFacts(req: Request): VisitFacts {
  const ua = userAgent(req);
  return {
    country: countryOf(req),
    browser: match(BROWSERS, ua),
    os: match(SYSTEMS, ua),
    device: deviceOf(ua),
    visitorId: visitorOf(req, ua),
  };
}

/** Just the source — "wa.me", "mail.google.com" — never the full URL. */
export function referrerHost(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").slice(0, 64);
  } catch {
    return "";
  }
}

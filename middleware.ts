import { NextRequest, NextResponse } from "next/server";
import { RATE_RULES, rateLimit } from "@/lib/rateLimit";
import { clientIp, looksMalicious } from "@/lib/security";

/**
 * The front door.
 *
 * Every single request passes through here before it reaches a page or an API
 * route, and it does three things that the individual handlers should not have
 * to repeat:
 *
 *   1. Throttles per address, with a tighter budget for /api, so a flood costs
 *      the attacker far more than it costs the server.
 *   2. Screens the URL itself — path and query string — for injection, script
 *      and traversal markers, and refuses them before any handler runs.
 *   3. Sets the security headers (CSP, frame, sniff, referrer, permissions) on
 *      every response.
 *
 * Route handlers still validate their own input: this is the outer perimeter,
 * not the only one.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    // Next.js injects inline hydration scripts and Tailwind inline styles.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // The pixel typeface (Pixelify Sans) is served by Google Fonts: the
    // stylesheet comes from fonts.googleapis.com and the files themselves from
    // fonts.gstatic.com. Without both, the whole site silently falls back to a
    // generic sans-serif.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

/** Paths a scanner probes for; there is nothing here to find. */
const BLOCKED_PATHS =
  /(^\/(wp-admin|wp-login|\.env|\.git|phpmyadmin|vendor\/phpunit|xmlrpc\.php|config\.json))/i;

const MAX_URL_LENGTH = 2048;

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const ip = clientIp(req);

  if (req.url.length > MAX_URL_LENGTH || BLOCKED_PATHS.test(pathname)) {
    return withSecurityHeaders(
      new NextResponse("Not found", { status: 404 })
    );
  }

  if (looksMalicious(pathname) || (search && looksMalicious(search))) {
    return withSecurityHeaders(
      NextResponse.json({ error: "Rejected request" }, { status: 400 })
    );
  }

  const global = rateLimit(`global:${ip}`, RATE_RULES.global);
  if (!global.ok) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "For mange forespørgsler" },
        { status: 429, headers: { "Retry-After": String(global.retryAfter) } }
      )
    );
  }

  if (pathname.startsWith("/api/")) {
    const api = rateLimit(`api:${ip}`, RATE_RULES.api);
    if (!api.ok) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "For mange forespørgsler" },
          { status: 429, headers: { "Retry-After": String(api.retryAfter) } }
        )
      );
    }

    const res = withSecurityHeaders(NextResponse.next());
    res.headers.set("X-RateLimit-Limit", String(api.limit));
    res.headers.set("X-RateLimit-Remaining", String(api.remaining));
    // Nothing under /api is ever cacheable — some of it is per-guest.
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

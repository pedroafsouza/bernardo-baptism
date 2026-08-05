import type { NextRequest } from "next/server";

/**
 * Request hardening helpers shared by every route.
 *
 * Prisma already parameterises every query, so classic SQL injection cannot
 * reach the database — but these guards stop hostile input long before that:
 * they cap what we are willing to read, reject anything that is not the shape
 * we expect, and refuse payloads that carry injection or script markers so the
 * attempt is logged instead of stored.
 */

/** Largest JSON body any endpoint on this site legitimately needs. */
export const MAX_BODY_BYTES = 16 * 1024;

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return (h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown").slice(0, 64);
}

export function userAgent(req: NextRequest | Request): string {
  return (req.headers.get("user-agent") || "unknown").slice(0, 256);
}

const SQL_INJECTION = [
  /(\bunion\b[\s\S]{0,40}\bselect\b)/i,
  /(\bselect\b[\s\S]{0,60}\bfrom\b[\s\S]{0,40}\bwhere\b)/i,
  /(\b(drop|alter|truncate)\b\s+\b(table|database|index)\b)/i,
  /(\binsert\b\s+\binto\b|\bdelete\b\s+\bfrom\b|\bupdate\b[\s\S]{0,40}\bset\b)/i,
  /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /(--|#)\s*$/,
  /;\s*(drop|delete|update|insert|select)\b/i,
  /\b(sleep|pg_sleep|benchmark|waitfor\s+delay|load_file|xp_cmdshell)\s*\(/i,
  /\/\*[\s\S]*?\*\//,
];

const SCRIPT_INJECTION = [
  /<\s*script\b/i,
  /javascript\s*:/i,
  /\bon(error|load|click|mouseover)\s*=/i,
  /<\s*iframe\b/i,
  /\$\{[\s\S]*?\}/,
  /\{\s*\$(ne|gt|lt|where|regex|or)\b/i,
];

const PATH_TRAVERSAL = [/\.\.[/\\]/, /%2e%2e[/\\%]/i, /\0/];

/** True when a value looks like an attack rather than a name or a code. */
export function looksMalicious(value: string): boolean {
  if (!value) return false;
  const decoded = safeDecode(value);
  return [...SQL_INJECTION, ...SCRIPT_INJECTION, ...PATH_TRAVERSAL].some(
    (re) => re.test(value) || re.test(decoded)
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Recursively scans anything parsed from a request body or query string. */
export function containsMaliciousInput(input: unknown, depth = 0): boolean {
  if (depth > 6) return true; // absurdly nested payload — treat as hostile
  if (typeof input === "string") return looksMalicious(input);
  if (Array.isArray(input)) {
    if (input.length > 200) return true;
    return input.some((v) => containsMaliciousInput(v, depth + 1));
  }
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>);
    if (entries.length > 60) return true;
    return entries.some(
      ([k, v]) => looksMalicious(k) || containsMaliciousInput(v, depth + 1)
    );
  }
  return false;
}

export type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; reason: "TOO_LARGE" | "INVALID" | "MALICIOUS" };

/**
 * Reads a JSON body with a hard size cap and an injection screen, so no route
 * ever hands unbounded or hostile input to the database layer.
 */
export async function readJson<T = Record<string, unknown>>(
  req: NextRequest | Request,
  maxBytes = MAX_BODY_BYTES
): Promise<JsonResult<T>> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    return { ok: false, status: 413, error: "Payload too large", reason: "TOO_LARGE" };
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, status: 400, error: "Invalid body", reason: "INVALID" };
  }

  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { ok: false, status: 413, error: "Payload too large", reason: "TOO_LARGE" };
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON", reason: "INVALID" };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: "Body must be a JSON object", reason: "INVALID" };
  }

  // Prototype pollution: these keys have no business in a request body.
  for (const banned of ["__proto__", "constructor", "prototype"]) {
    if (Object.prototype.hasOwnProperty.call(parsed, banned)) {
      return { ok: false, status: 400, error: "Rejected input", reason: "MALICIOUS" };
    }
  }

  if (containsMaliciousInput(parsed)) {
    return { ok: false, status: 400, error: "Rejected input", reason: "MALICIOUS" };
  }

  return { ok: true, data: parsed as T };
}

/** Trims, caps and screens a single field. Returns null when unacceptable. */
export function safeString(
  value: unknown,
  { max = 120, min = 0 }: { max?: number; min?: number } = {}
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  if (looksMalicious(trimmed)) return null;
  return trimmed;
}

/** Identifiers we generate ourselves: uuid-ish or guest codes. */
export function safeId(value: unknown, max = 64): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}

export function safeInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Usernames are the one identifier a human types, so keep the set tight. */
export function safeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 32) return null;
  return /^[a-z0-9._-]+$/.test(trimmed) ? trimmed : null;
}

/**
 * Passwords are never trimmed or pattern-screened (a strong password may
 * legitimately contain quotes or dashes) — only bounded, then hashed.
 */
export function safePassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 1 || value.length > 200) return null;
  return value;
}

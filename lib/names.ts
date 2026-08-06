/**
 * Guest names.
 *
 * A guest record holds one household on one line — "Marie and Kevin",
 * "Kitt og Jan", "Carlos, Dinha, Sonia & Morges" — because that is how the
 * invitation is addressed. Bernardo, however, greets people one by one, so the
 * line has to be taken apart again and put back together in the guest's own
 * language.
 */
import type { Lang } from "@/lib/i18n";

/** Every way the guest list joins two names together. */
const SEPARATORS = /\s*(?:,|&|\band\b|\bog\b|\be\b|\bog så\b)\s*/gi;

/**
 * Splits a household line into the individual people in it. Unknown shapes fall
 * back to the whole line, so a name is never lost or mangled into nothing.
 */
export function splitGuestNames(name: string | null | undefined): string[] {
  const line = (name ?? "").trim();
  if (!line) return [];

  const parts = line
    .split(SEPARATORS)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [line];
}

const AND: Record<Lang, string> = { da: "og", en: "and", pt: "e" };

/** "A", "A og B", "A, B og C" — Oxford-comma-free, like a person would say it. */
export function formatNameList(names: string[], lang: Lang): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  const last = clean[clean.length - 1]!;
  return `${clean.slice(0, -1).join(", ")} ${AND[lang] ?? AND.en} ${last}`;
}

/** The greeting list for a household, straight from its guest-list line. */
export function guestGreetingList(name: string | null | undefined, lang: Lang): string {
  return formatNameList(splitGuestNames(name), lang);
}

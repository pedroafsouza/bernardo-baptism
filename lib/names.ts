/**
 * Guest names.
 *
 * A guest record holds one household on one line — "Marie and Kevin",
 * "Kitt og Jan", "Carlos, Dinha, Sonia & Morges" — because that is how the
 * invitation is addressed. Bernardo, however, greets people one by one, so the
 * line has to be taken apart again and put back together in the guest's own
 * language.
 */
import type { Lang } from "@/lib/lang";

/**
 * Every way the guest list joins two names together: the three languages of
 * the invitation ("and", "og", "e"), the ampersand, the plus and the plain
 * comma. Joining words are only joining words when they stand alone between
 * spaces, so "Ogilvy" and "Andersen" stay whole, and the longer "og så" is
 * offered before the "og" inside it.
 */
const SEPARATORS = /\s*[,&+]\s*|\s+(?:og\s+så|and|og|e)(?=\s)\s*/giu;

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

/**
 * How many people a household line names — "and" and "," mean two people, so
 * "Bibi and Pedro" is two and "Esdras, Vladia e Cecilia" is three. An
 * invitation always has somebody to answer for it, so this is never zero.
 */
export function countGuestNames(name: string | null | undefined): number {
  return Math.max(splitGuestNames(name).length, 1);
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

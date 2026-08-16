/**
 * The set of languages an invitation link can carry.
 *
 * This lives apart from `lib/i18n.ts` because that module is a client
 * component: the server needs the language of a link (to build the preview
 * card) without pulling the whole dictionary — and the client half of the app
 * across the boundary with it.
 */
export type Lang = "da" | "en" | "pt";

export const LANGS: Lang[] = ["da", "en", "pt"];

export const DEFAULT_LANG: Lang = "da";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as string[]).includes(value);
}

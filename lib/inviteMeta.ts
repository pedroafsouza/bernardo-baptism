import { EVENT } from "@/lib/config";
import type { Lang } from "@/lib/lang";

/**
 * The link preview.
 *
 * An invitation is pasted into WhatsApp, Messenger or an email, and the first
 * thing the household sees is the card the link unfurls into — before they ever
 * tap it. That card is built here from the same two things the link already
 * carries: the language it was written in, and who it was written for.
 */
export type InviteMeta = {
  title: string;
  /** The occasion on its own, for the site name beside the card. */
  siteName: string;
  description: string;
  /** Open Graph locale, which is not spelled the same way as our `lang`. */
  locale: string;
  alternateLocales: string[];
};

const OG_LOCALE: Record<Lang, string> = {
  da: "da_DK",
  en: "en_GB",
  pt: "pt_BR",
};

const SITE_NAME: Record<Lang, string> = {
  da: "Bernardos barnedåb",
  en: "Bernardo's christening",
  pt: "Batizado do Bernardo",
};

/** `Heraldo & Rose — Bernardos barnedåb`, or just the occasion for a bare link. */
function title(lang: Lang, name: string | null): string {
  if (!name) return SITE_NAME[lang];
  return `${name} — ${SITE_NAME[lang]}`;
}

function description(lang: Lang, name: string | null): string {
  if (lang === "pt") {
    const opening = name
      ? `${name}, vocês estão convidados para o batizado do Bernardo.`
      : "Você está convidado para o batizado do Bernardo.";
    return `${opening} ${EVENT.ceremonyTimePt} · ${EVENT.ceremonyPlace}. Ajude o Bernardo a chegar à igreja em um joguinho e confirme sua presença no final — até ${EVENT.rsvpDeadlinePt}.`;
  }

  if (lang === "en") {
    const opening = name
      ? `${name}, you are invited to Bernardo's christening.`
      : "You are invited to Bernardo's christening.";
    return `${opening} ${EVENT.ceremonyTimeEn} · ${EVENT.ceremonyPlace}. Help Bernardo reach the church in a little game and reply at the finish line — by ${EVENT.rsvpDeadlineEn}.`;
  }

  const opening = name
    ? `${name}, I er inviteret til Bernardos barnedåb.`
    : "Du er inviteret til Bernardos barnedåb.";
  return `${opening} ${EVENT.ceremonyTime} · ${EVENT.ceremonyPlace}. Hjælp Bernardo hen til kirken i et lille spil og svar ved målstregen — senest den ${EVENT.rsvpDeadline}.`;
}

export function inviteMeta(lang: Lang, name: string | null): InviteMeta {
  // A blank name is no name: an all-whitespace household would otherwise show
  // up as a stray dash in front of the title.
  const household = name?.trim() || null;

  return {
    title: title(lang, household),
    siteName: SITE_NAME[lang],
    description: description(lang, household),
    locale: OG_LOCALE[lang],
    alternateLocales: Object.entries(OG_LOCALE)
      .filter(([id]) => id !== lang)
      .map(([, locale]) => locale),
  };
}

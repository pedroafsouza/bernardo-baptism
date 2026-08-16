import { EVENT } from "@/lib/config";
import { formatNameList } from "@/lib/names";

export type MessageLang = "da" | "en" | "pt";
export type MessageChannel = "whatsapp" | "email";

export const MESSAGE_LANGS: { id: MessageLang; label: string }[] = [
  { id: "da", label: "Dansk" },
  { id: "en", label: "English" },
  { id: "pt", label: "Português" },
];

export const MESSAGE_CHANNELS: { id: MessageChannel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "E-mail" },
];

const CEREMONY: Record<MessageLang, string> = {
  da: EVENT.ceremonyTime,
  en: EVENT.ceremonyTimeEn,
  pt: "Sábado, 3 de outubro de 2026, às 11:00",
};

/**
 * The reply deadline belongs in the invitation itself: the kitchen and the
 * seating are ordered from the answers, so it is never only in the app.
 */
const DEADLINE: Record<MessageLang, string> = {
  da: EVENT.rsvpDeadline,
  en: EVENT.rsvpDeadlineEn,
  pt: EVENT.rsvpDeadlinePt,
};

const RECEPTION: Record<MessageLang, string> = {
  da: EVENT.receptionTime,
  en: EVENT.receptionTimeEn,
  pt: "Logo após a cerimônia",
};

/**
 * How the parents sign the invitation: the way they would say it out loud, with
 * the family name once at the end and the joining word of the language the
 * guest is reading — "Birgitte og Pedro Augusto Freitas de Souza", "Birgitte
 * and Pedro Augusto Freitas de Souza", "Birgitte e Pedro Augusto Freitas de
 * Souza". A parent who does not carry the family name keeps their own in full.
 */
export function inviteSignature(lang: MessageLang): string {
  const shorten = (full: string) => full.replace(` ${EVENT.familyName}`, "").trim() || full;
  return formatNameList([shorten(EVENT.mother), EVENT.father], lang);
}

/**
 * Builds the invitation text for one guest.
 *
 * The personal link is the whole point of the invitation, so it always appears
 * on its own line — WhatsApp and Gmail both auto-link it that way.
 */
export function buildInviteMessage(opts: {
  name: string;
  link: string;
  lang: MessageLang;
  channel: MessageChannel;
}): { subject: string; body: string } {
  const { name, link, lang, channel } = opts;
  const ceremony = CEREMONY[lang];
  const reception = RECEPTION[lang];
  const deadline = DEADLINE[lang];
  const signature = inviteSignature(lang);

  if (lang === "da") {
    const subject = `Invitation til Bernardos barnedåb — ${EVENT.ceremonyTime}`;
    const body =
      channel === "whatsapp"
        ? `Hej ${name}!

Vi holder barnedåb for Bernardo, og vi vil så gerne have jer med.

${ceremony}
${EVENT.ceremonyPlace}
Fest bagefter: ${EVENT.receptionPlace}

Vi har lavet et lille spil som invitation — klik jer ind, hjælp Bernardo hen til kirken og svar til sidst:
${link}

Svar venligst senest den ${deadline}.

Kærlig hilsen
${signature}`
        : `Kære ${name}

Den 16. juni 2026 kom Bernardo til verden, og nu skal han døbes. Det vil glæde os meget, hvis I vil fejre dagen sammen med os.

Ceremoni: ${ceremony}
Sted: ${EVENT.ceremonyPlace}

Reception: ${reception}
Sted: ${EVENT.receptionPlace}

I stedet for et almindeligt svarkort har vi lavet et lille spil. Følg jeres personlige link, hjælp Bernardo med at nå frem til kirken, og giv os besked om I kommer:

${link}

Svar venligst senest den ${deadline}.

Vi glæder os til at se jer.

Kærlig hilsen
${signature}`;
    return { subject, body };
  }

  if (lang === "pt") {
    const subject = `Convite para o batizado do Bernardo — ${ceremony}`;
    const body =
      channel === "whatsapp"
        ? `Oi ${name}!

Vamos batizar o Bernardo e queremos muito você com a gente.

${ceremony}
${EVENT.ceremonyPlace}
Festa depois: ${EVENT.receptionPlace}

Fizemos um joguinho como convite — entra, ajuda o Bernardo a chegar na igreja e confirma no final:
${link}

Confirme até ${deadline}, por favor.

Com carinho,
${signature}`
        : `Querido(a) ${name},

No dia 16 de junho de 2026 o Bernardo chegou ao mundo, e agora vamos batizá-lo. Ficaríamos muito felizes em celebrar esse dia com você.

Cerimônia: ${ceremony}
Local: ${EVENT.ceremonyPlace}

Recepção: ${reception}
Local: ${EVENT.receptionPlace}

Em vez de um convite comum, criamos um pequeno jogo. Acesse seu link pessoal, ajude o Bernardo a chegar à igreja e confirme sua presença no final:

${link}

Confirme até ${deadline}, por favor.

Esperamos você!

Com carinho,
${signature}`;
    return { subject, body };
  }

  const subject = `Invitation to Bernardo's christening — ${ceremony}`;
  const body =
    channel === "whatsapp"
      ? `Hi ${name}!

We're christening Bernardo and we'd love to have you there.

${ceremony}
${EVENT.ceremonyPlace}
Party afterwards: ${EVENT.receptionPlace}

We made a little game as the invitation — jump in, help Bernardo reach the church, and RSVP at the end:
${link}

Please reply by ${deadline}.

Love,
${signature}`
      : `Dear ${name},

On 16 June 2026 Bernardo came into the world, and now he is going to be christened. It would mean a lot to us if you could celebrate the day with us.

Ceremony: ${ceremony}
Where: ${EVENT.ceremonyPlace}

Reception: ${reception}
Where: ${EVENT.receptionPlace}

Instead of a normal RSVP card we built a little game. Follow your personal link, help Bernardo reach the church, and let us know if you can come:

${link}

Please reply by ${deadline}.

We hope to see you there.

Love,
${signature}`;

  return { subject, body };
}

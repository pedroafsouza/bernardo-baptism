"use client";

import { useCallback } from "react";
import { useLangParam } from "@/lib/langParam";

export type Lang = "da" | "en" | "pt";
export const LANGS: Lang[] = ["da", "en", "pt"];
export const DEFAULT_LANG: Lang = "da";

export const LANG_LABEL: Record<Lang, string> = {
  da: "Dansk",
  en: "English",
  pt: "Português",
};

type Dict = {
  title: string;
  welcome: (name: string) => string;
  oscarIntro: {
    p1: string;
    name: string;
    p2: string;
    blessings: string;
    p3: string;
    treats: string;
    p4: string;
  };
  howToPlay: string;
  howMove: string;
  howJump: string;
  howCrosses: string;
  howBones: string;
  play: string;
  skipToAnswer: string;
  skip: string;
  language: string;

  loading: string;
  loadingGame: string;
  loadingWorld: string;
  loadingInvitation: string;
  noCodeTitle: string;
  noCodeBody: string;
  noCodeExample: string;
  notFoundTitle: string;
  notFoundBody: (code: string) => string;
  demoBadge: string;
  demoTry: string;
  demoNotice: string;

  bonesTooltip: string;
  music: string;
  musicOn: string;
  musicOff: string;

  rsvpWelcome: (name: string) => string;
  invitedTo: string;
  oscarChurch: string;
  child: string;
  birthday: string;
  mother: string;
  father: string;
  ceremony: string;
  reception: string;
  guestCount: string;
  kidsCount: string;
  invitedForOne: string;
  maxGuestsNote: (n: number) => string;
  maxKidsNote: (n: number) => string;
  noKidsNote: string;
  yes: string;
  no: string;
  sending: string;
  thanks: string;
  willMiss: string;
  thanksBody: (adults: number, kids: number) => string;
  declinedBody: string;
  changeReply: string;
  close: string;
  genericError: string;

  yourScore: string;
  bonesCollected: string;
  blessingsFound: string;
  leaderboard: string;
  leaderboardEmpty: string;
  points: string;
  rank: string;
  player: string;
  newRecord: string;
};

const da: Dict = {
  title: "Bernardos barnedåb",
  welcome: (n) => `Velkommen, ${n}!`,
  oscarIntro: {
    p1: "Vov! Jeg er ",
    name: "Oscar",
    p2: ", Bernardos hund. Hjælp min modige bjørn med kappe med at samle de ",
    blessings: "3 hellige velsignelser",
    p3: ", så kirken åbner. Snup ",
    treats: "godbidderne",
    p4: " på vejen — de er selvfølgelig til mig!",
  },
  howToPlay: "Sådan spiller du",
  howMove: "Bevæg dig: Piletaster / A · D",
  howJump: "Hop: HOP / Pil op / W / Mellemrum",
  howCrosses: "Saml alle 3 kors, og gå så ind i kirken",
  howBones: "Saml godbidder til Oscar & spark til bolden for sjov!",
  play: "Spil",
  skipToAnswer: "Spring til svar",
  skip: "Spring over",
  language: "Sprog",

  loading: "Indlæser…",
  loadingGame: "Indlæser spil…",
  loadingWorld: "Indlæser verden…",
  loadingInvitation: "Indlæser invitation…",
  noCodeTitle: "Bernardos barnedåb",
  noCodeBody: "Ingen invitationskode fundet. Brug venligst dit personlige link, f.eks.",
  noCodeExample: "/?code=DEMO",
  notFoundTitle: "Gæst ikke fundet",
  notFoundBody: (c) => `Vi kunne ikke finde en invitation til koden ${c}.`,
  demoBadge: "DEMO",
  demoTry: "Prøv demoen",
  demoNotice: "Demo-tilstand: du kan prøve alt, men intet svar bliver gemt.",

  bonesTooltip: "Godbidder til Oscar",
  music: "Musik",
  musicOn: "Slå musik fra",
  musicOff: "Slå musik til",

  rsvpWelcome: (n) => `Velkommen, ${n}!`,
  invitedTo: "Du er inviteret til en barnedåb",
  oscarChurch:
    "Du nåede frem til kirken! Bernardo & jeg vil blive så glade for at fejre det sammen med dig. Fortæl os venligst, om du kan komme.",
  child: "Barn",
  birthday: "Født",
  mother: "Mor",
  father: "Far",
  ceremony: "Ceremoni",
  reception: "Reception",
  guestCount: "Antal voksne",
  kidsCount: "Antal børn",
  invitedForOne: "Din invitation gælder én person.",
  maxGuestsNote: (n) => `Din invitation gælder op til ${n} ${n === 1 ? "voksen" : "voksne"}.`,
  maxKidsNote: (n) => `Din invitation har plads til op til ${n} ${n === 1 ? "barn" : "børn"}.`,
  noKidsNote: "Din invitation er uden børn.",
  yes: "Ja tak, med glæde",
  no: "Desværre, nej tak",
  sending: "Sender…",
  thanks: "Tak!",
  willMiss: "Vi vil savne dig",
  thanksBody: (adults, kids) =>
    kids > 0
      ? `Vi glæder os til at fejre det sammen med jer: ${adults} ${adults === 1 ? "voksen" : "voksne"} og ${kids} ${kids === 1 ? "barn" : "børn"}.`
      : `Vi glæder os til at fejre det sammen med dig og dit selskab på ${adults}.`,
  declinedBody: "Tak, fordi du gav besked. Vi håber at se dig ved en anden lejlighed.",
  changeReply: "Ret dit svar",
  close: "Luk",
  genericError: "Noget gik galt",

  yourScore: "Din score",
  bonesCollected: "Godbidder",
  blessingsFound: "Velsignelser",
  leaderboard: "Toplisten",
  leaderboardEmpty: "Ingen har spillet endnu — bliv den første!",
  points: "point",
  rank: "#",
  player: "Spiller",
  newRecord: "Ny personlig rekord!",
};

const en: Dict = {
  title: "Bernardo's Baptism",
  welcome: (n) => `Welcome, ${n}!`,
  oscarIntro: {
    p1: "Woof! I'm ",
    name: "Oscar",
    p2: ", Bernardo's dog. Help my brave bear in a cape collect the ",
    blessings: "3 holy blessings",
    p3: " so the church opens. Grab ",
    treats: "the treats",
    p4: " along the way — they're for me, of course!",
  },
  howToPlay: "How to play",
  howMove: "Move: Arrow keys / A · D",
  howJump: "Jump: HOP / Arrow up / W / Space",
  howCrosses: "Collect all 3 crosses, then walk into the church",
  howBones: "Collect treats for Oscar & kick the ball for fun!",
  play: "Play",
  skipToAnswer: "Skip to RSVP",
  skip: "Skip",
  language: "Language",

  loading: "Loading…",
  loadingGame: "Loading game…",
  loadingWorld: "Loading world…",
  loadingInvitation: "Loading invitation…",
  noCodeTitle: "Bernardo's Baptism",
  noCodeBody: "No invitation code found. Please use your personal link, e.g.",
  noCodeExample: "/?code=DEMO",
  notFoundTitle: "Guest not found",
  notFoundBody: (c) => `We couldn't find an invitation for the code ${c}.`,
  demoBadge: "DEMO",
  demoTry: "Try the demo",
  demoNotice: "Demo mode: try everything you like — no answer is saved.",

  bonesTooltip: "Treats for Oscar",
  music: "Music",
  musicOn: "Turn music off",
  musicOff: "Turn music on",

  rsvpWelcome: (n) => `Welcome, ${n}!`,
  invitedTo: "You are invited to a baptism",
  oscarChurch:
    "You made it to the church! Bernardo & I would be so happy to celebrate with you. Please let us know if you can come.",
  child: "Child",
  birthday: "Born",
  mother: "Mother",
  father: "Father",
  ceremony: "Ceremony",
  reception: "Reception",
  guestCount: "Number of adults",
  kidsCount: "Number of children",
  invitedForOne: "Your invitation is for one person.",
  maxGuestsNote: (n) => `Your invitation is for up to ${n} adult${n === 1 ? "" : "s"}.`,
  maxKidsNote: (n) => `Your invitation has room for up to ${n} child${n === 1 ? "" : "ren"}.`,
  noKidsNote: "Your invitation does not include children.",
  yes: "Yes please, with joy",
  no: "Sadly, I can't make it",
  sending: "Sending…",
  thanks: "Thank you!",
  willMiss: "We'll miss you",
  thanksBody: (adults, kids) =>
    kids > 0
      ? `We can't wait to celebrate with you: ${adults} adult${adults === 1 ? "" : "s"} and ${kids} child${kids === 1 ? "" : "ren"}.`
      : `We can't wait to celebrate with you and your party of ${adults}.`,
  declinedBody: "Thank you for letting us know. We hope to see you another time.",
  changeReply: "Change your reply",
  close: "Close",
  genericError: "Something went wrong",

  yourScore: "Your score",
  bonesCollected: "Treats",
  blessingsFound: "Blessings",
  leaderboard: "Leaderboard",
  leaderboardEmpty: "Nobody has played yet — be the first!",
  points: "points",
  rank: "#",
  player: "Player",
  newRecord: "New personal best!",
};

const pt: Dict = {
  title: "Batizado do Bernardo",
  welcome: (n) => `Bem-vindo, ${n}!`,
  oscarIntro: {
    p1: "Au au! Eu sou o ",
    name: "Oscar",
    p2: ", o cachorro do Bernardo. Ajude meu ursinho de capa a juntar as ",
    blessings: "3 bênçãos sagradas",
    p3: " para a igreja abrir. Pegue ",
    treats: "os petiscos",
    p4: " pelo caminho — são para mim, claro!",
  },
  howToPlay: "Como jogar",
  howMove: "Mover: setas / A · D",
  howJump: "Pular: PULA / seta para cima / W / espaço",
  howCrosses: "Junte as 3 cruzes e entre na igreja",
  howBones: "Pegue petiscos para o Oscar e chute a bola!",
  play: "Jogar",
  skipToAnswer: "Ir direto para a resposta",
  skip: "Pular",
  language: "Idioma",

  loading: "Carregando…",
  loadingGame: "Carregando o jogo…",
  loadingWorld: "Carregando o mundo…",
  loadingInvitation: "Carregando o convite…",
  noCodeTitle: "Batizado do Bernardo",
  noCodeBody: "Nenhum código de convite encontrado. Use o seu link pessoal, por exemplo",
  noCodeExample: "/?code=DEMO",
  notFoundTitle: "Convidado não encontrado",
  notFoundBody: (c) => `Não encontramos um convite para o código ${c}.`,
  demoBadge: "DEMO",
  demoTry: "Experimentar a demo",
  demoNotice: "Modo demo: experimente à vontade — nenhuma resposta é guardada.",

  bonesTooltip: "Petiscos para o Oscar",
  music: "Música",
  musicOn: "Desligar a música",
  musicOff: "Ligar a música",

  rsvpWelcome: (n) => `Bem-vindo, ${n}!`,
  invitedTo: "Você está convidado para um batizado",
  oscarChurch:
    "Você chegou à igreja! O Bernardo e eu ficaríamos muito felizes em celebrar com você. Conte para nós se você vem.",
  child: "Criança",
  birthday: "Nascimento",
  mother: "Mãe",
  father: "Pai",
  ceremony: "Cerimônia",
  reception: "Recepção",
  guestCount: "Número de adultos",
  kidsCount: "Número de crianças",
  invitedForOne: "O seu convite é para uma pessoa.",
  maxGuestsNote: (n) => `O seu convite é para até ${n} adulto${n === 1 ? "" : "s"}.`,
  maxKidsNote: (n) => `O seu convite tem lugar para até ${n} criança${n === 1 ? "" : "s"}.`,
  noKidsNote: "O seu convite não inclui crianças.",
  yes: "Sim, com alegria",
  no: "Infelizmente não posso",
  sending: "Enviando…",
  thanks: "Obrigado!",
  willMiss: "Vamos sentir sua falta",
  thanksBody: (adults, kids) =>
    kids > 0
      ? `Mal podemos esperar para celebrar com vocês: ${adults} adulto${adults === 1 ? "" : "s"} e ${kids} criança${kids === 1 ? "" : "s"}.`
      : `Mal podemos esperar para celebrar com você e seu grupo de ${adults}.`,
  declinedBody: "Obrigado por avisar. Esperamos ver você em outra ocasião.",
  changeReply: "Alterar sua resposta",
  close: "Fechar",
  genericError: "Algo deu errado",

  yourScore: "Sua pontuação",
  bonesCollected: "Petiscos",
  blessingsFound: "Bênçãos",
  leaderboard: "Ranking",
  leaderboardEmpty: "Ninguém jogou ainda — seja o primeiro!",
  points: "pontos",
  rank: "#",
  player: "Jogador",
  newRecord: "Novo recorde pessoal!",
};

export const DICTS: Record<Lang, Dict> = { da, en, pt };

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as string[]).includes(value);
}

/**
 * Language lives only in the `?lang=` query parameter — there is no stored
 * preference — so an invitation link always opens in the language it carries
 * and switching language rewrites the URL. Unknown or missing values fall back
 * to Danish.
 */
export function useLang() {
  const [param, setParam] = useLangParam();
  const lang: Lang = isLang(param) ? param : DEFAULT_LANG;

  const setLang = useCallback(
    (next: Lang) => {
      setParam(next);
    },
    [setParam]
  );

  return { lang, setLang, t: DICTS[lang] };
}

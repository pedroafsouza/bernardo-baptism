"use client";

import { useCallback, useEffect, useState } from "react";

export type Lang = "da" | "en";
export const LANGS: Lang[] = ["da", "en"];
export const DEFAULT_LANG: Lang = "da";
const STORAGE_KEY = "lang";

export const LANG_LABEL: Record<Lang, string> = { da: "Dansk", en: "English" };

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
  yes: string;
  no: string;
  sending: string;
  thanks: string;
  willMiss: string;
  thanksBody: (n: number) => string;
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
  noCodeExample: "/?code=GUEST_101",
  notFoundTitle: "Gæst ikke fundet",
  notFoundBody: (c) => `Vi kunne ikke finde en invitation til koden ${c}.`,

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
  guestCount: "Antal gæster",
  yes: "Ja tak, med glæde",
  no: "Desværre, nej tak",
  sending: "Sender…",
  thanks: "Tak!",
  willMiss: "Vi vil savne dig",
  thanksBody: (n) => `Vi glæder os til at fejre det sammen med dig og dit selskab på ${n}.`,
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
  noCodeExample: "/?code=GUEST_101",
  notFoundTitle: "Guest not found",
  notFoundBody: (c) => `We couldn't find an invitation for the code ${c}.`,

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
  guestCount: "Number of guests",
  yes: "Yes please, with joy",
  no: "Sadly, I can't make it",
  sending: "Sending…",
  thanks: "Thank you!",
  willMiss: "We'll miss you",
  thanksBody: (n) => `We can't wait to celebrate with you and your party of ${n}.`,
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

export const DICTS: Record<Lang, Dict> = { da, en };

export function readStoredLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "da" ? saved : DEFAULT_LANG;
}

/**
 * Language is Danish by default and only persisted once the guest actively picks
 * one, so a stored "en" survives reloads while everyone else keeps Danish.
 */
export function useLang() {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(readStoredLang());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — fall back to in-memory only */
    }
  }, []);

  return { lang, setLang, t: DICTS[lang] };
}

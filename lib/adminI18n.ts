"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The admin portal is used by both sides of the family, so it speaks Danish and
 * English. This is deliberately separate from the guest-facing dictionary in
 * `lib/i18n.ts`: the portal has its own vocabulary, and the two languages are
 * chosen independently (you can prepare a Portuguese invitation from an English
 * portal).
 */
export type AdminLang = "da" | "en";
export const ADMIN_LANGS: AdminLang[] = ["da", "en"];
export const ADMIN_LANG_LABEL: Record<AdminLang, string> = {
  da: "Dansk",
  en: "English",
};

const STORAGE_KEY = "adminLang";
const DEFAULT_LANG: AdminLang = "da";

export type AdminDict = {
  // login
  adminLogin: string;
  username: string;
  usernamePlaceholder: string;
  password: string;
  login: string;
  loginFailed: string;
  loading: string;

  // header
  title: string;
  exportCsv: string;
  logout: string;
  language: string;

  // headline
  accepted: string;
  ofTotal: (n: number) => string;
  answeredYes: string;
  totalPeople: string;
  adultsKids: (adults: number, kids: number) => string;
  invitationsSent: string;
  leftToSend: (n: number) => string;
  sendProgress: string;

  // metric cards
  invitedHouseholds: string;
  confirmed: string;
  declined: string;
  awaitingReply: string;
  hasPlayed: string;

  // missing panels
  notSentYet: (n: number) => string;
  allInvitationsSent: string;
  message: string;
  missingReply: (n: number) => string;
  everyoneAnswered: string;
  link: string;
  copied: string;
  leaderboard: string;
  nobodyPlayed: string;
  notPlayedYet: (n: number) => string;

  // guest form
  editGuest: string;
  addGuest: string;
  namePlaceholder: string;
  adults: string;
  kids: string;
  expectedToCome: string;
  inviteSent: string;
  update: string;
  add: string;
  cancel: string;

  // filters
  allGroups: string;
  allStatuses: string;
  sentAll: string;
  sentYes: string;
  sentNo: string;
  linkLanguage: string;
  csvFilename: string;

  // table
  colSent: string;
  colCode: string;
  colName: string;
  colGroup: string;
  colStatus: string;
  colScore: string;
  colActions: string;
  sentOn: (date: string) => string;
  markAsSent: string;
  notExpected: string;
  viewMessage: string;
  copyUrl: string;
  edit: string;
  remove: string;
  noGuestsMatch: string;

  // errors
  couldNotLoad: string;
  couldNotSave: string;
  couldNotUpdateSent: string;
  deleteConfirm: string;
  copyFailed: (url: string) => string;
  copyFailedShort: string;

  // invite message modal
  invitationFor: (name: string) => string;
  close: string;
  subject: string;
  messageLabel: string;
  copy: string;
  copyMessage: string;
  copyLinkOnly: string;
  openWhatsApp: string;
  openEmail: string;
  invitationSentTo: (name: string) => string;

  // danger zone
  dangerZone: string;
  dangerIntro: string;
  resetScoresTitle: string;
  resetScoresBody: string;
  resetAnswersTitle: string;
  resetAnswersBody: string;
  resetAllTitle: string;
  resetAllBody: string;
  choose: string;
  typeResetToConfirm: string;
  resetNow: string;
  resetting: string;
  resetFailed: string;
};

const da: AdminDict = {
  adminLogin: "Admin-login",
  username: "Brugernavn",
  usernamePlaceholder: "brugernavn",
  password: "Adgangskode",
  login: "Log ind",
  loginFailed: "Login mislykkedes",
  loading: "Indlæser…",

  title: "Barnedåb-admin",
  exportCsv: "Eksportér CSV",
  logout: "Log ud",
  language: "Sprog",

  accepted: "Accepteret",
  ofTotal: (n) => `af ${n}`,
  answeredYes: "invitationer besvaret med ja",
  totalPeople: "Personer i alt",
  adultsKids: (a, k) => `${a} voksne · ${k} børn`,
  invitationsSent: "Invitationer sendt",
  leftToSend: (n) => `${n} mangler at blive sendt`,
  sendProgress: "Udsendelses-fremdrift",

  invitedHouseholds: "Inviterede husstande",
  confirmed: "Bekræftet",
  declined: "Afbud",
  awaitingReply: "Afventer svar",
  hasPlayed: "Har spillet",

  notSentYet: (n) => `Ikke sendt endnu (${n})`,
  allInvitationsSent: "Alle invitationer er sendt!",
  message: "Besked",
  missingReply: (n) => `Mangler svar (${n})`,
  everyoneAnswered: "Alle inviterede har svaret!",
  link: "Link",
  copied: "Kopieret!",
  leaderboard: "Topliste",
  nobodyPlayed: "Ingen har spillet endnu.",
  notPlayedYet: (n) => `Har ikke spillet endnu: ${n}`,

  editGuest: "Rediger gæst",
  addGuest: "Tilføj gæst",
  namePlaceholder: "Navn",
  adults: "Voksne",
  kids: "Børn",
  expectedToCome: "Forventes at komme",
  inviteSent: "Invitation sendt",
  update: "Opdater",
  add: "Tilføj",
  cancel: "Annuller",

  allGroups: "Alle grupper",
  allStatuses: "Alle statusser",
  sentAll: "Sendt: alle",
  sentYes: "Invitation sendt",
  sentNo: "Ikke sendt",
  linkLanguage: "Link-sprog",
  csvFilename: "barnedaab-gaester",

  colSent: "Sendt",
  colCode: "Kode",
  colName: "Navn",
  colGroup: "Gruppe",
  colStatus: "Status",
  colScore: "Score",
  colActions: "Handlinger",
  sentOn: (d) => `Sendt ${d}`,
  markAsSent: "Marker som sendt",
  notExpected: "Forventes ikke at komme",
  viewMessage: "Se besked",
  copyUrl: "Kopiér URL",
  edit: "Rediger",
  remove: "Slet",
  noGuestsMatch: "Ingen gæster matcher filtrene.",

  couldNotLoad: "Kunne ikke indlæse",
  couldNotSave: "Kunne ikke gemme",
  couldNotUpdateSent: "Kunne ikke opdatere 'invitation sendt'",
  deleteConfirm: "Slet denne gæst?",
  copyFailed: (url) => `Kunne ikke kopiere automatisk. Link: ${url}`,
  copyFailedShort: "Kunne ikke kopiere — markér teksten og kopiér manuelt.",

  invitationFor: (n) => `Invitation til ${n}`,
  close: "Luk",
  subject: "Emne",
  messageLabel: "Besked",
  copy: "Kopiér",
  copyMessage: "Kopiér besked",
  copyLinkOnly: "Kopiér kun link",
  openWhatsApp: "Åbn WhatsApp",
  openEmail: "Åbn e-mail",
  invitationSentTo: (n) => `Invitationen er sendt til ${n}`,

  dangerZone: "Farezone — nulstil database",
  dangerIntro:
    "Handlingerne kan ikke fortrydes. Serveren tager automatisk en backup ved hver udrulning, men ikke her.",
  resetScoresTitle: "Nulstil topliste",
  resetScoresBody:
    "Sletter point, knogler og spilresultater for alle. Svar på invitationen røres ikke.",
  resetAnswersTitle: "Nulstil svar",
  resetAnswersBody:
    "Sætter alle gæster tilbage til \u201eafventer svar\u201c og rydder spilresultater. Gæstelisten og \u201einvitation sendt\u201c bevares.",
  resetAllTitle: "Nulstil hele databasen",
  resetAllBody:
    "Sletter alle gæster og genskaber den oprindelige gæsteliste helt uden svar. Alt andet går tabt.",
  choose: "Vælg",
  typeResetToConfirm: "Skriv RESET for at bekræfte",
  resetNow: "Nulstil nu",
  resetting: "Nulstiller…",
  resetFailed: "Nulstilling mislykkedes",
};

const en: AdminDict = {
  adminLogin: "Admin login",
  username: "Username",
  usernamePlaceholder: "username",
  password: "Password",
  login: "Log in",
  loginFailed: "Login failed",
  loading: "Loading…",

  title: "Baptism admin",
  exportCsv: "Export CSV",
  logout: "Log out",
  language: "Language",

  accepted: "Accepted",
  ofTotal: (n) => `of ${n}`,
  answeredYes: "invitations answered yes",
  totalPeople: "People in total",
  adultsKids: (a, k) => `${a} adults · ${k} kids`,
  invitationsSent: "Invitations sent",
  leftToSend: (n) => `${n} left to send`,
  sendProgress: "Sending progress",

  invitedHouseholds: "Invited households",
  confirmed: "Confirmed",
  declined: "Declined",
  awaitingReply: "Awaiting reply",
  hasPlayed: "Have played",

  notSentYet: (n) => `Not sent yet (${n})`,
  allInvitationsSent: "Every invitation has been sent!",
  message: "Message",
  missingReply: (n) => `Missing reply (${n})`,
  everyoneAnswered: "Everyone invited has answered!",
  link: "Link",
  copied: "Copied!",
  leaderboard: "Leaderboard",
  nobodyPlayed: "Nobody has played yet.",
  notPlayedYet: (n) => `Haven't played yet: ${n}`,

  editGuest: "Edit guest",
  addGuest: "Add guest",
  namePlaceholder: "Name",
  adults: "Adults",
  kids: "Kids",
  expectedToCome: "Expected to come",
  inviteSent: "Invitation sent",
  update: "Update",
  add: "Add",
  cancel: "Cancel",

  allGroups: "All groups",
  allStatuses: "All statuses",
  sentAll: "Sent: all",
  sentYes: "Invitation sent",
  sentNo: "Not sent",
  linkLanguage: "Link language",
  csvFilename: "christening-guests",

  colSent: "Sent",
  colCode: "Code",
  colName: "Name",
  colGroup: "Group",
  colStatus: "Status",
  colScore: "Score",
  colActions: "Actions",
  sentOn: (d) => `Sent ${d}`,
  markAsSent: "Mark as sent",
  notExpected: "Not expected to come",
  viewMessage: "View message",
  copyUrl: "Copy URL",
  edit: "Edit",
  remove: "Delete",
  noGuestsMatch: "No guests match the filters.",

  couldNotLoad: "Could not load",
  couldNotSave: "Could not save",
  couldNotUpdateSent: "Could not update 'invitation sent'",
  deleteConfirm: "Delete this guest?",
  copyFailed: (url) => `Could not copy automatically. Link: ${url}`,
  copyFailedShort: "Could not copy — select the text and copy it manually.",

  invitationFor: (n) => `Invitation for ${n}`,
  close: "Close",
  subject: "Subject",
  messageLabel: "Message",
  copy: "Copy",
  copyMessage: "Copy message",
  copyLinkOnly: "Copy link only",
  openWhatsApp: "Open WhatsApp",
  openEmail: "Open e-mail",
  invitationSentTo: (n) => `The invitation has been sent to ${n}`,

  dangerZone: "Danger zone — reset database",
  dangerIntro:
    "These actions cannot be undone. The server takes a backup on every deploy, but not here.",
  resetScoresTitle: "Reset leaderboard",
  resetScoresBody:
    "Deletes points, treats and game results for everyone. RSVP answers are left untouched.",
  resetAnswersTitle: "Reset answers",
  resetAnswersBody:
    "Puts every guest back to \u201cawaiting reply\u201d and clears game results. The guest list and \u201cinvitation sent\u201d are kept.",
  resetAllTitle: "Reset the whole database",
  resetAllBody:
    "Deletes every guest and recreates the original guest list with no answers at all. Everything else is lost.",
  choose: "Choose",
  typeResetToConfirm: "Type RESET to confirm",
  resetNow: "Reset now",
  resetting: "Resetting…",
  resetFailed: "Reset failed",
};

export const ADMIN_DICTS: Record<AdminLang, AdminDict> = { da, en };

export function readStoredAdminLang(): AdminLang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "da" ? saved : DEFAULT_LANG;
}

export function useAdminLang() {
  const [lang, setLangState] = useState<AdminLang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(readStoredAdminLang());
  }, []);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — in-memory only */
    }
  }, []);

  return { lang, setLang, t: ADMIN_DICTS[lang] };
}

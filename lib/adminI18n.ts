"use client";

import { useCallback } from "react";
import { useLangParam } from "@/lib/langParam";

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

  // menu
  menuGuests: string;
  menuAudit: string;
  menuAdmins: string;
  menuAccount: string;
  signedInAs: (name: string) => string;

  // password
  changePassword: string;
  changePasswordBody: string;
  mustChangePasswordTitle: string;
  mustChangePasswordBody: string;
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
  savePassword: string;
  saving: string;
  passwordsDoNotMatch: string;
  passwordChanged: string;
  passwordRulesTitle: string;
  passwordRules: string[];
  passwordProblem: (problem: string) => string;
  firstRunHint: string;

  // admins
  adminsTitle: string;
  adminsIntro: string;
  addAdmin: string;
  addAdminIntro: string;
  createAdmin: string;
  temporaryPasswordLabel: string;
  temporaryPassword: string;
  active: string;
  you: string;
  colAdmin: string;
  colStatusAdmin: string;
  colLastLogin: string;
  colCreated: string;
  removeSelf: string;
  removeSelfConfirm: string;
  removeAdminConfirm: (name: string) => string;
  lastAdminProtected: string;
  adminCreated: (name: string) => string;
  adminRemoved: (name: string) => string;

  // audit
  auditTitle: string;
  auditIntro: string;
  auditEmpty: string;
  auditCount: (n: number) => string;
  allActions: string;
  allActors: string;
  refresh: string;
  colWhen: string;
  colAction: string;
  colWho: string;
  colTarget: string;
  colDetail: string;
  colIp: string;
  previous: string;
  next: string;
  pageOf: (page: number, pages: number) => string;
  auditAction: (action: string) => string;
};

/** Human-readable action names, shared shape between the two languages. */
const AUDIT_LABELS_DA: Record<string, string> = {
  LOGIN_SUCCESS: "Log ind",
  LOGIN_FAILED: "Mislykket login",
  LOGIN_LOCKED: "Konto låst",
  LOGOUT: "Log ud",
  PASSWORD_CHANGED: "Adgangskode ændret",
  PASSWORD_REJECTED: "Adgangskode afvist",
  ADMIN_CREATED: "Administrator oprettet",
  ADMIN_DELETED: "Administrator slettet",
  ADMIN_BOOTSTRAPPED: "Første administrator",
  GUEST_CREATED: "Gæst oprettet",
  GUEST_UPDATED: "Gæst opdateret",
  GUEST_DELETED: "Gæst slettet",
  INVITE_MARKED_SENT: "Invitation sendt",
  INVITE_MARKED_UNSENT: "Invitation fortrudt",
  INVITE_MESSAGE_OPENED: "Invitation åbnet",
  GUEST_LINK_COPIED: "Gæstelink kopieret",
  RSVP_SUBMITTED: "Svar modtaget",
  DATABASE_RESET: "Database nulstillet",
  RATE_LIMITED: "Begrænset (for mange forsøg)",
  REQUEST_BLOCKED: "Forespørgsel blokeret",
  UNAUTHORIZED: "Uautoriseret adgang",
};

const AUDIT_LABELS_EN: Record<string, string> = {
  LOGIN_SUCCESS: "Signed in",
  LOGIN_FAILED: "Failed login",
  LOGIN_LOCKED: "Account locked",
  LOGOUT: "Signed out",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_REJECTED: "Password rejected",
  ADMIN_CREATED: "Administrator added",
  ADMIN_DELETED: "Administrator removed",
  ADMIN_BOOTSTRAPPED: "First administrator",
  GUEST_CREATED: "Guest created",
  GUEST_UPDATED: "Guest updated",
  GUEST_DELETED: "Guest deleted",
  INVITE_MARKED_SENT: "Invitation sent",
  INVITE_MARKED_UNSENT: "Invitation un-sent",
  INVITE_MESSAGE_OPENED: "Invitation opened",
  GUEST_LINK_COPIED: "Guest link copied",
  RSVP_SUBMITTED: "RSVP received",
  DATABASE_RESET: "Database reset",
  RATE_LIMITED: "Rate limited",
  REQUEST_BLOCKED: "Request blocked",
  UNAUTHORIZED: "Unauthorised access",
};

const PASSWORD_PROBLEMS_DA: Record<string, string> = {
  TOO_SHORT: "Mindst 12 tegn",
  TOO_LONG: "Højst 200 tegn",
  NO_LOWERCASE: "Mangler et lille bogstav",
  NO_UPPERCASE: "Mangler et stort bogstav",
  NO_DIGIT: "Mangler et tal",
  NO_SYMBOL: "Mangler et specialtegn",
  COMMON: "For almindelig adgangskode",
  CONTAINS_USERNAME: "Må ikke indeholde brugernavnet",
  REPEATED: "For mange gentagne tegn",
  SEQUENTIAL: "Indeholder en oplagt talrække eller tastaturrække",
};

const PASSWORD_PROBLEMS_EN: Record<string, string> = {
  TOO_SHORT: "At least 12 characters",
  TOO_LONG: "At most 200 characters",
  NO_LOWERCASE: "Needs a lowercase letter",
  NO_UPPERCASE: "Needs an uppercase letter",
  NO_DIGIT: "Needs a digit",
  NO_SYMBOL: "Needs a symbol",
  COMMON: "Too common a password",
  CONTAINS_USERNAME: "Must not contain the username",
  REPEATED: "Too many repeated characters",
  SEQUENTIAL: "Contains an obvious sequence",
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

  menuGuests: "Gæster",
  menuAudit: "Log",
  menuAdmins: "Adgang",
  menuAccount: "Min konto",
  signedInAs: (n) => `Logget ind som ${n}`,

  changePassword: "Skift adgangskode",
  changePasswordBody: "Vælg en ny adgangskode for",
  mustChangePasswordTitle: "Vælg en stærk adgangskode",
  mustChangePasswordBody:
    "Kontoen bruger stadig en midlertidig adgangskode og kan ikke bruges til andet, før den er skiftet. Det gælder",
  currentPassword: "Nuværende adgangskode",
  newPassword: "Ny adgangskode",
  repeatPassword: "Gentag ny adgangskode",
  savePassword: "Gem adgangskode",
  saving: "Gemmer…",
  passwordsDoNotMatch: "De to adgangskoder er ikke ens",
  passwordChanged: "Adgangskoden er skiftet. Alle andre browsere er logget ud.",
  passwordRulesTitle: "Krav til adgangskoden",
  passwordRules: [
    "Mindst 12 tegn",
    "Store og små bogstaver",
    "Mindst ét tal og ét specialtegn",
    "Ikke en almindelig adgangskode og ikke brugernavnet",
  ],
  passwordProblem: (p) => PASSWORD_PROBLEMS_DA[p] ?? p,
  firstRunHint:
    "Første gang: brugernavn admin og adgangskode admin — derefter skal du straks vælge en stærk adgangskode.",

  adminsTitle: "Administratorer",
  adminsIntro:
    "Administratorer kan tilføje flere og fjerne hinanden — også sig selv. Der skal dog altid være mindst én tilbage.",
  addAdmin: "Tilføj administrator",
  addAdminIntro:
    "Vælg en midlertidig adgangskode og giv den videre personligt. Den nye administrator skal skifte den ved første login.",
  createAdmin: "Opret",
  temporaryPasswordLabel: "Midlertidig adgangskode",
  temporaryPassword: "Midlertidig adgangskode",
  active: "Aktiv",
  you: "dig",
  colAdmin: "Administrator",
  colStatusAdmin: "Status",
  colLastLogin: "Sidste login",
  colCreated: "Oprettet",
  removeSelf: "Fjern mig",
  removeSelfConfirm:
    "Fjern din egen administratorkonto? Du bliver logget ud med det samme.",
  removeAdminConfirm: (n) => `Fjern administratoren ${n}?`,
  lastAdminProtected: "Den sidste administrator kan ikke fjernes.",
  adminCreated: (n) => `Administratoren ${n} er oprettet.`,
  adminRemoved: (n) => `Administratoren ${n} er fjernet.`,

  auditTitle: "Aktivitetslog",
  auditIntro:
    "Alt væsentligt bliver registreret: logins, invitationer, ændringer af gæster, administratorer og blokerede forsøg.",
  auditEmpty: "Ingen hændelser endnu.",
  auditCount: (n) => `${n} hændelser`,
  allActions: "Alle handlinger",
  allActors: "Alle brugere",
  refresh: "Opdater",
  colWhen: "Tidspunkt",
  colAction: "Handling",
  colWho: "Hvem",
  colTarget: "Mål",
  colDetail: "Detaljer",
  colIp: "IP",
  previous: "Forrige",
  next: "Næste",
  pageOf: (p, total) => `Side ${p} af ${total}`,
  auditAction: (a) => AUDIT_LABELS_DA[a] ?? a,
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

  menuGuests: "Guests",
  menuAudit: "Activity log",
  menuAdmins: "Access",
  menuAccount: "My account",
  signedInAs: (n) => `Signed in as ${n}`,

  changePassword: "Change password",
  changePasswordBody: "Choose a new password for",
  mustChangePasswordTitle: "Choose a strong password",
  mustChangePasswordBody:
    "This account still uses a temporary password and can do nothing else until it is changed. That applies to",
  currentPassword: "Current password",
  newPassword: "New password",
  repeatPassword: "Repeat new password",
  savePassword: "Save password",
  saving: "Saving…",
  passwordsDoNotMatch: "The two passwords do not match",
  passwordChanged: "Password changed. Every other browser has been signed out.",
  passwordRulesTitle: "Password requirements",
  passwordRules: [
    "At least 12 characters",
    "Upper and lower case letters",
    "At least one digit and one symbol",
    "Not a common password, and not the username",
  ],
  passwordProblem: (p) => PASSWORD_PROBLEMS_EN[p] ?? p,
  firstRunHint:
    "First run: username admin, password admin — you must then set a strong password straight away.",

  adminsTitle: "Administrators",
  adminsIntro:
    "Administrators can add others and remove each other — including themselves. There must always be at least one left.",
  addAdmin: "Add administrator",
  addAdminIntro:
    "Pick a temporary password and hand it over in person. The new administrator must change it at first login.",
  createAdmin: "Create",
  temporaryPasswordLabel: "Temporary password",
  temporaryPassword: "Temporary password",
  active: "Active",
  you: "you",
  colAdmin: "Administrator",
  colStatusAdmin: "Status",
  colLastLogin: "Last login",
  colCreated: "Created",
  removeSelf: "Remove me",
  removeSelfConfirm: "Remove your own administrator account? You will be signed out at once.",
  removeAdminConfirm: (n) => `Remove the administrator ${n}?`,
  lastAdminProtected: "The last administrator cannot be removed.",
  adminCreated: (n) => `Administrator ${n} created.`,
  adminRemoved: (n) => `Administrator ${n} removed.`,

  auditTitle: "Activity log",
  auditIntro:
    "Everything that matters is recorded: logins, invitations, guest and administrator changes, and blocked attempts.",
  auditEmpty: "No events yet.",
  auditCount: (n) => `${n} events`,
  allActions: "All actions",
  allActors: "All users",
  refresh: "Refresh",
  colWhen: "When",
  colAction: "Action",
  colWho: "Who",
  colTarget: "Target",
  colDetail: "Details",
  colIp: "IP",
  previous: "Previous",
  next: "Next",
  pageOf: (p, total) => `Page ${p} of ${total}`,
  auditAction: (a) => AUDIT_LABELS_EN[a] ?? a,
};

export const ADMIN_DICTS: Record<AdminLang, AdminDict> = { da, en };

export function isAdminLang(value: unknown): value is AdminLang {
  return value === "da" || value === "en";
}

/**
 * Like the guest side, the portal language is read from — and written to — the
 * `?lang=` query parameter only, so it is never out of sync with the URL.
 */
export function useAdminLang() {
  const [param, setParam] = useLangParam();
  const lang: AdminLang = isAdminLang(param) ? param : DEFAULT_LANG;

  const setLang = useCallback(
    (next: AdminLang) => {
      setParam(next);
    },
    [setParam]
  );

  return { lang, setLang, t: ADMIN_DICTS[lang] };
}

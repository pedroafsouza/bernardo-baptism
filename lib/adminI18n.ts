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
  /** The day is answered in two halves, so it is counted in two halves. */
  atChurch: string;
  atReception: string;
  churchAdults: string;
  churchKids: string;
  invitationsSent: string;
  leftToSend: (n: number) => string;
  sendProgress: string;

  // metric cards
  invitedHouseholds: string;
  invitedPeople: string;
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
  /** Why the admin form asks for seats and not for head counts. */
  guestAnswersHint: string;
  namePlaceholder: string;
  adults: string;
  kids: string;
  maxAdults: string;
  maxKids: string;
  ofMax: (n: number) => string;
  noKidsInvited: string;
  /** The individual answers behind a household's numbers. */
  whoIsComing: string;
  showPeople: string;
  hidePeople: string;
  personAttending: string;
  personDeclined: string;
  personPending: string;
  allergies: string;
  kidsAllergies: string;
  noAllergies: string;
  allergyCount: (n: number) => string;
  /** Answering on a guest's behalf, straight from the guest list. */
  answerFor: (name: string) => string;
  answerHint: string;
  allergyPlaceholder: string;
  kidsAtChurch: string;
  kidsAtParty: string;
  generateCode: string;
  expectedToCome: string;
  inviteSent: string;
  update: string;
  add: string;
  cancel: string;

  // the printable report of who is coming
  report: string;
  reportTitle: string;
  reportIntro: string;
  print: string;
  backToPanel: string;
  onlyComing: string;
  everyone: string;
  printedOn: (date: string) => string;
  nobodyComing: string;
  colHousehold: string;
  colPerson: string;
  childrenLine: (n: number) => string;

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

  // visits
  allTime: string;
  lastDays: (n: number) => string;
  totalVisits: string;
  visitorCount: (n: number) => string;
  invitationsOpened: string;
  householdsOpened: string;
  realInvitations: string;
  demoViews: (n: number) => string;
  countries: string;
  unknownCountry: string;
  browsers: string;
  systems: string;
  devices: string;
  languages: string;
  referrers: string;
  visitsPerGuest: string;
  lastSeen: string;
  neverOpened: string;
  noVisitsYet: string;
  visitsPrivacy: string;
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
  menuVisits: string;
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
  /** Positive wording for one requirement, ticked off live as it is met. */
  passwordRequirement: (rule: string) => string;
  passwordProblem: (problem: string) => string;
  passwordAllRulesMet: string;
  currentPasswordRequired: string;
  passwordDoesNotMeetRules: string;
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
  RSVP_EDITED: "Svar noteret af vært",
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
  RSVP_EDITED: "Answer taken by a host",
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

const PASSWORD_REQUIREMENTS_DA: Record<string, string> = {
  TOO_SHORT: "Mindst 12 tegn",
  TOO_LONG: "Højst 200 tegn",
  NO_LOWERCASE: "Et lille bogstav",
  NO_UPPERCASE: "Et stort bogstav",
  NO_DIGIT: "Et tal",
  NO_SYMBOL: "Et specialtegn (fx ! ? - # @)",
  COMMON: "Ikke en almindelig adgangskode",
  CONTAINS_USERNAME: "Indeholder ikke brugernavnet",
  REPEATED: "Højst tre ens tegn i træk",
  SEQUENTIAL: "Ingen oplagt tal- eller tastaturrække",
};

const PASSWORD_REQUIREMENTS_EN: Record<string, string> = {
  TOO_SHORT: "At least 12 characters",
  TOO_LONG: "At most 200 characters",
  NO_LOWERCASE: "A lowercase letter",
  NO_UPPERCASE: "An uppercase letter",
  NO_DIGIT: "A digit",
  NO_SYMBOL: "A symbol (e.g. ! ? - # @)",
  COMMON: "Not a common password",
  CONTAINS_USERNAME: "Does not contain the username",
  REPEATED: "No more than three identical characters in a row",
  SEQUENTIAL: "No obvious number or keyboard run",
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
  atChurch: "I kirken",
  atReception: "Til festen",
  churchAdults: "Voksne i kirken",
  churchKids: "Børn i kirken",
  adultsKids: (a, k) => `${a} voksne · ${k} børn`,
  invitationsSent: "Invitationer sendt",
  leftToSend: (n) => `${n} mangler at blive sendt`,
  sendProgress: "Udsendelses-fremdrift",

  invitedHouseholds: "Inviterede husstande",
  invitedPeople: "Inviterede personer",
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
  guestAnswersHint:
    "Gæsterne svarer selv, hvor mange der kommer i kirken og til festen.",
  namePlaceholder: "Navn",
  adults: "Voksne (bekræftet)",
  kids: "Børn (bekræftet)",
  maxAdults: "Maks. voksne",
  maxKids: "Maks. børn",
  ofMax: (n) => `Invitationen giver plads til ${n}`,
  noKidsInvited: "Invitationen er uden børn",
  whoIsComing: "Hvem kommer",
  showPeople: "Vis de enkelte svar",
  hidePeople: "Skjul de enkelte svar",
  personAttending: "Kommer",
  personDeclined: "Kommer ikke",
  personPending: "Har ikke svaret",
  allergies: "Allergi & kost",
  kidsAllergies: "Børn",
  noAllergies: "Ingen angivet",
  allergyCount: (n) => `${n} med allergi eller kosthensyn`,
  answerFor: (name) => `Svar for ${name}`,
  answerHint: "Tryk for at svare på gæstens vegne",
  allergyPlaceholder: "Allergier",
  kidsAtChurch: "Børn i kirken",
  kidsAtParty: "Børn til festen",
  generateCode: "Lav kode ud fra navnet",
  expectedToCome: "Forventes at komme",
  inviteSent: "Invitation sendt",
  update: "Opdater",
  add: "Tilføj",
  cancel: "Annuller",

  report: "Rapport",
  reportTitle: "Hvem kommer",
  reportIntro: "Til udskrift og til at rette et enkelt svar undervejs.",
  print: "Udskriv",
  backToPanel: "Tilbage til panelet",
  onlyComing: "Kun dem der kommer",
  everyone: "Alle",
  printedOn: (date) => `Udskrevet ${date}`,
  nobodyComing: "Ingen har sagt ja endnu.",
  colHousehold: "Husstand",
  colPerson: "Person",
  childrenLine: (n) => `${n} børn`,

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
  allTime: "Alt",
  lastDays: (n) => `${n} dage`,
  totalVisits: "Besøg",
  visitorCount: (n) => (n === 1 ? "1 besøgende" : `${n} besøgende`),
  invitationsOpened: "Invitationer åbnet",
  householdsOpened: "husstande der har set invitationen",
  realInvitations: "Rigtige invitationer",
  demoViews: (n) => (n === 1 ? "1 demo-visning" : `${n} demo-visninger`),
  countries: "Lande",
  unknownCountry: "Ukendt",
  browsers: "Browsere",
  systems: "Styresystemer",
  devices: "Enheder",
  languages: "Sprog",
  referrers: "Kommer fra",
  visitsPerGuest: "Besøg per gæst",
  lastSeen: "Sidst set",
  neverOpened: "Aldrig åbnet",
  noVisitsYet: "Ingen besøg endnu",
  visitsPrivacy:
    "Ingen IP-adresser gemmes. Besøgende tælles med en hash, der kun holder én dag.",
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
  menuVisits: "Besøg",
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
  passwordsDoNotMatch: "De to nye adgangskoder er ikke ens",
  passwordChanged: "Adgangskoden er skiftet. Alle andre browsere er logget ud.",
  passwordRulesTitle: "Krav til adgangskoden",
  passwordRequirement: (r) => PASSWORD_REQUIREMENTS_DA[r] ?? r,
  passwordProblem: (p) => PASSWORD_PROBLEMS_DA[p] ?? p,
  passwordAllRulesMet: "Adgangskoden opfylder alle krav",
  currentPasswordRequired: "Indtast din nuværende adgangskode",
  passwordDoesNotMeetRules: "Den nye adgangskode mangler noget — se listen ovenfor",
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
  atChurch: "At the church",
  atReception: "At the party",
  churchAdults: "Adults at the church",
  churchKids: "Children at the church",
  adultsKids: (a, k) => `${a} adults · ${k} kids`,
  invitationsSent: "Invitations sent",
  leftToSend: (n) => `${n} left to send`,
  sendProgress: "Sending progress",

  invitedHouseholds: "Invited households",
  invitedPeople: "Invited people",
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
  guestAnswersHint:
    "Guests answer for themselves how many come to the church and to the party.",
  namePlaceholder: "Name",
  adults: "Adults (confirmed)",
  kids: "Kids (confirmed)",
  maxAdults: "Max adults",
  maxKids: "Max kids",
  ofMax: (n) => `The invitation has room for ${n}`,
  noKidsInvited: "This invitation does not include children",
  whoIsComing: "Who is coming",
  showPeople: "Show the individual answers",
  hidePeople: "Hide the individual answers",
  personAttending: "Coming",
  personDeclined: "Not coming",
  personPending: "No answer yet",
  allergies: "Allergies & diet",
  kidsAllergies: "Children",
  noAllergies: "None given",
  allergyCount: (n) => `${n} with allergies or dietary needs`,
  answerFor: (name) => `Answer for ${name}`,
  answerHint: "Tap to answer on the guest's behalf",
  allergyPlaceholder: "Allergies",
  kidsAtChurch: "Children at church",
  kidsAtParty: "Children at the party",
  generateCode: "Make a code from the name",
  expectedToCome: "Expected to come",
  inviteSent: "Invitation sent",
  update: "Update",
  add: "Add",
  cancel: "Cancel",

  report: "Report",
  reportTitle: "Who is coming",
  reportIntro: "For printing, and for correcting a single answer along the way.",
  print: "Print",
  backToPanel: "Back to the panel",
  onlyComing: "Only those coming",
  everyone: "Everyone",
  printedOn: (date) => `Printed ${date}`,
  nobodyComing: "Nobody has said yes yet.",
  colHousehold: "Household",
  colPerson: "Person",
  childrenLine: (n) => `${n} children`,

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
  allTime: "All time",
  lastDays: (n) => `${n} days`,
  totalVisits: "Visits",
  visitorCount: (n) => (n === 1 ? "1 visitor" : `${n} visitors`),
  invitationsOpened: "Invitations opened",
  householdsOpened: "households that have looked",
  realInvitations: "Real invitations",
  demoViews: (n) => (n === 1 ? "1 demo view" : `${n} demo views`),
  countries: "Countries",
  unknownCountry: "Unknown",
  browsers: "Browsers",
  systems: "Systems",
  devices: "Devices",
  languages: "Languages",
  referrers: "Came from",
  visitsPerGuest: "Visits per guest",
  lastSeen: "Last seen",
  neverOpened: "Never opened",
  noVisitsYet: "No visits yet",
  visitsPrivacy:
    "No addresses are stored. Visitors are counted with a hash that lasts a single day.",
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
  menuVisits: "Visits",
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
  passwordRequirement: (r) => PASSWORD_REQUIREMENTS_EN[r] ?? r,
  passwordProblem: (p) => PASSWORD_PROBLEMS_EN[p] ?? p,
  passwordAllRulesMet: "The password meets every requirement",
  currentPasswordRequired: "Enter your current password",
  passwordDoesNotMeetRules: "The new password is missing something — see the list above",
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

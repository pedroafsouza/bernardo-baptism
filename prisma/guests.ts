/**
 * The real guest list for Bernardo's christening.
 *
 * Every invitation code is a playful portmanteau of the invitees' own names, so
 * the link a guest receives is unmistakably theirs (and a small joke on its
 * own). Solo guests get the "-ARDO" ending borrowed from Bernardo himself.
 *
 * `guestCount` is the number of adults the household is invited to bring and
 * `kids` how many children — both are maximums. A household with `kids: 0` is
 * invited without children, and the RSVP form will not even offer the choice.
 *
 * This list is the invitation, not the answer: seeding updates names, groups
 * and capacity, and never touches a reply somebody has already given.
 */
export type SeedGuest = {
  guestCode: string;
  name: string;
  group: string;
  guestCount: number;
  kids: number;
  likely: boolean;
};

export const SEED_GUESTS: SeedGuest[] = [
  { guestCode: "BIBEDRO", name: "Bibi and Pedro", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "KITJAN", name: "Kitt og Jan", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "HELENARDO", name: "Helene", group: "Family", guestCount: 1, kids: 0, likely: true },
  { guestCode: "GURLARDO", name: "Gurli", group: "Family", guestCount: 1, kids: 0, likely: true },
  { guestCode: "FARMARDO", name: "Farmor", group: "Family", guestCount: 1, kids: 0, likely: true },
  { guestCode: "TINACARL", name: "Tina og Carl Emil", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "VIRGIA", name: "Vini and Georgia", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "YASIEL", name: "Yasmin and Daniel", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "LAYANLARS", name: "Layana and Lars", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "SERANDA", name: "Sergio and Fernanda", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "PAVLARDO", name: "Pavle", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "LISASPER", name: "Lisa og Casper", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "GABAREK", name: "Gaby and Marek", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "WINHIAS", name: "Winnie og Mathias", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "RUTAWES", name: "Rūta and Wes", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "LINICO", name: "Line and Nico", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "FERNANIEL", name: "Fernanda and Daniel", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "EVARPER", name: "Evaristo and Kasper", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "EVADANSK", name: "Eva (dk)", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "BECCREDE", name: "Becca and Krede", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "FERNALLE", name: "Fernanda and Kalle", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "GUIWES", name: "Gui and Wes", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "PAOCHIM", name: "Paola and Joachim", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "QUEMIR", name: "Queren and Samir", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "MARVIN", name: "Marie and Kevin", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "LOUISARDO", name: "Louise", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "MARCELARDO", name: "Marcela", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "TICITHAIS", name: "Tici and Thais", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "ANDREHARDO", name: "Andreh", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "CINTIARDO", name: "Cintia", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "MARCOFU", name: "Marco and Fu Fei", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "OLIVIARDO", name: "Olivia", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "ISACOB", name: "Isa and Jacob", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "MONICARDO", name: "Monica", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "PRISCILLARDO", name: "Priscilla", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "JOHNNYARDO", name: "Johnny", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "RICAREN", name: "Ricardo and Karen", group: "Friends", guestCount: 3, kids: 1, likely: true },
  { guestCode: "STEENJETTE", name: "Steen og Jette", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "SUSANPER", name: "Susanne og Per", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "MAJTIN", name: "Majken og Martin", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "MARMON", name: "Marie og Simon", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "ANNESOREN", name: "Anne og Søren", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "LAERNICO", name: "Lærke og Nico", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "CHRISMETTE", name: "Christian og Mette", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "MIKKELARDO", name: "Mikkel", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "MARLENEPLUS1", name: "Marlene and new boyfriend", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "OLISBETH", name: "Ole og Lisbeth", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "THADRA", name: "Thales and Sandra", group: "Friends", guestCount: 2, kids: 2, likely: true },
  { guestCode: "MIRZAFRU", name: "Mirza and Wife", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "DANILARDO", name: "Danilo", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "KISSARDO", name: "Kiss", group: "Friends", guestCount: 1, kids: 0, likely: true },
  { guestCode: "DANIRINA", name: "Daniel and Irina", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "WASHDICIS", name: "Washigton and Medicis", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "ALVARCELA", name: "Alvaro and Marcela", group: "Friends", guestCount: 2, kids: 0, likely: true },
  { guestCode: "SUELIARDO", name: "Sueli", group: "Family", guestCount: 1, kids: 0, likely: true },
  { guestCode: "NATAVO", name: "Natalia and Gustavo", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "CARLOSCREW", name: "Carlos, Dinha, Sonia, Morges", group: "Family", guestCount: 4, kids: 0, likely: true },
  { guestCode: "ESDVLADIA", name: "Esdras, Vladia e Cecilia", group: "Family", guestCount: 2, kids: 1, likely: true },
  { guestCode: "CLAUDMOR", name: "Claude and Mor", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "ANAJUNIOR", name: "Ana and Junior", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "PEDROTATY", name: "Pedro and Taty", group: "Family", guestCount: 2, kids: 0, likely: true },
  { guestCode: "PAIOLGA", name: "Pai and Olga", group: "Family", guestCount: 2, kids: 0, likely: true },

  // Invited, but far away and unlikely to travel.
  { guestCode: "EDUARDARDO", name: "Eduardo", group: "Family", guestCount: 1, kids: 0, likely: false },

  // Invited earlier and kept on the list: they are not on the latest sheet, but
  // an invitation already went their way and nobody withdraws one of those.
  { guestCode: "PAVELARDO", name: "Pavel", group: "Friends", guestCount: 1, kids: 0, likely: false },
  { guestCode: "AYOICA", name: "Ayoub and Monica", group: "Friends", guestCount: 2, kids: 1, likely: true },
  { guestCode: "LUISANA", name: "Ana Luisa", group: "Family", guestCount: 2, kids: 2, likely: false },
  { guestCode: "ESDOLGA", name: "Esdras & Olga", group: "Family", guestCount: 2, kids: 1, likely: false },
  { guestCode: "HERAROSE", name: "Heraldo & Rose", group: "Family", guestCount: 2, kids: 0, likely: false },
];

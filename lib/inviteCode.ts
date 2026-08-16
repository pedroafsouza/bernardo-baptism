/**
 * Invitation codes.
 *
 * The code is the whole invitation: it is what a guest types, taps or receives,
 * so it has to be short, unmistakably theirs and impossible to mistype into
 * somebody else's reply. The house style is a portmanteau of the names on the
 * invitation, and a guest invited on their own borrows Bernardo's own ending.
 *
 * Adding a household by hand should not mean inventing one of these under
 * pressure, so the admin panel proposes one from the name and only asks the
 * human to approve it.
 */
import { splitGuestNames } from "@/lib/names";

const MAX_LENGTH = 24;

/** Plain A–Z: "Rūta" and "Søren" travel through links and QR codes as ASCII. */
function letters(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .replace(/å/gi, "aa")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

/**
 * A code proposed from the names on the invitation — "Bibi and Pedro" becomes
 * BIBIPEDR, "Louise" becomes LOUISARDO. Anything already taken gets a number,
 * because two households must never share a link.
 */
export function inviteCodeFromName(name: string, taken: Iterable<string> = []): string {
  const used = new Set([...taken].map((code) => code.trim().toUpperCase()));
  const people = splitGuestNames(name).map(letters).filter(Boolean);

  let base: string;
  if (people.length === 0) {
    base = "GUEST";
  } else if (people.length === 1) {
    base = `${people[0]!.slice(0, 8)}ARDO`;
  } else {
    base = people
      .slice(0, 3)
      .map((person) => person.slice(0, 4))
      .join("");
  }
  base = base.slice(0, MAX_LENGTH);

  if (!used.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base.slice(0, MAX_LENGTH - String(n).length)}${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base.slice(0, MAX_LENGTH - 6)}${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

/**
 * Admin accounts live in the database (see `lib/adminAuth.ts`), not in the
 * environment: passwords are salted scrypt hashes, sessions are revocable, and
 * administrators are added or removed from the panel itself. A fresh database
 * bootstraps a single `admin` / `admin` account that can do nothing except set
 * a strong password of its own.
 */

export const EVENT = {
  /// The name the family shares, so the parents can sign an invitation with
  /// it once — "Birgitte og Pedro Augusto Freitas de Souza" — instead of twice.
  familyName: "Freitas de Souza",
  child: "Bernardo Freitas de Souza",
  birthday: "16.06.2026",
  mother: "Birgitte Freitas de Souza",
  father: "Pedro Augusto Freitas de Souza",
  ceremonyTime: "Lørdag den 3. oktober 2026 kl. 11:00",
  ceremonyTimeEn: "Saturday 3 October 2026 at 11:00",
  ceremonyTimePt: "Sábado, 3 de outubro de 2026, às 11:00",
  ceremonyPlace: "Filips Kirke, Kastrupvej 55, 2300 København",
  receptionTime: "Efterfølgende",
  receptionTimeEn: "Straight after the ceremony",
  receptionTimePt: "Logo após a cerimônia",
  receptionPlace: "Little House Amager, Lindgreens Allé 1, 2300 København",
  /// The kitchen and the seating are ordered from the replies, so there is a
  /// day after which an answer is too late to plan around.
  rsvpDeadline: "20. september 2026",
  rsvpDeadlineEn: "20 September 2026",
  rsvpDeadlinePt: "20 de setembro de 2026",
  /// A wish list, never an expectation — giving anything at all is optional.
  giftList: "https://onskeskyen.dk/s/etg4pd",
};

export type GuestStatus = "PENDING" | "ATTENDING" | "DECLINED";
export const GROUPS = ["Family", "Friends", "Godparents", "Colleagues", "Other"];
export const STATUSES: GuestStatus[] = ["PENDING", "ATTENDING", "DECLINED"];

// ---- Scoring ----
// Every bone Oscar gets is worth points, every blessing is worth a lot more, and
// finishing the run (reaching the church) earns a completion bonus.
export const POINTS_PER_BONE = 10;
export const POINTS_PER_BLESSING = 100;
export const POINTS_FINISH_BONUS = 250;

export function computeScore(bones: number, blessings: number, finished: boolean) {
  return (
    Math.max(0, bones) * POINTS_PER_BONE +
    Math.max(0, Math.min(blessings, 3)) * POINTS_PER_BLESSING +
    (finished ? POINTS_FINISH_BONUS : 0)
  );
}

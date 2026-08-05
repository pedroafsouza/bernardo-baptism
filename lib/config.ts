/**
 * Admin credentials live only in the environment — never in the repository.
 * See `.env.example`; the login route refuses every attempt while they are unset,
 * so a misconfigured deploy fails closed instead of exposing a default password.
 */
export const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
export const ADMIN_USER = process.env.ADMIN_USER || "";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
export const ADMIN_CONFIGURED = Boolean(ADMIN_USER && ADMIN_PASSWORD && ADMIN_SECRET);

export const EVENT = {
  child: "Bernardo Freitas de Souza",
  birthday: "16.06.2026",
  mother: "Birgite Freitas de Souza",
  father: "Pedro Augusto Freitas de Souza",
  ceremonyTime: "Lørdag den 3. oktober 2026 kl. 11:00",
  ceremonyTimeEn: "Saturday 3 October 2026 at 11:00",
  ceremonyTimePt: "Sábado, 3 de outubro de 2026, às 11:00",
  ceremonyPlace: "Filips kirke, Kastrupvej 55, 2300 København",
  receptionTime: "Efterfølgende",
  receptionTimeEn: "Straight after the ceremony",
  receptionTimePt: "Logo após a cerimônia",
  receptionPlace: "Bella Uno, festlokale A+B, Emma Gads Vej 28, 2300 København",
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

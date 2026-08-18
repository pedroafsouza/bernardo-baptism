/**
 * Everything the invitation says about a real family: the child, the parents,
 * the addresses and the hours.
 *
 * None of it lives in this repository. The deployment pipeline injects it as
 * environment variables (see `.env.example`), and what is written down here is
 * a made-up christening used for two things: the public `/?code=DEMO` link,
 * which must never show a real address, and any environment that was started
 * without the variables set.
 */
export type EventDetails = {
  /** Shared surname, so the parents can sign an invitation with it once. */
  familyName: string;
  child: string;
  birthday: string;
  mother: string;
  father: string;
  ceremonyTime: string;
  ceremonyTimeEn: string;
  ceremonyTimePt: string;
  ceremonyPlace: string;
  receptionTime: string;
  receptionTimeEn: string;
  receptionTimePt: string;
  receptionPlace: string;
  /** The kitchen and the seating are ordered from the replies, so an answer
      after this day is too late to plan around. */
  rsvpDeadline: string;
  rsvpDeadlineEn: string;
  rsvpDeadlinePt: string;
  /** A wish list, never an expectation — giving anything at all is optional. */
  giftList: string;
};

/**
 * A christening that never happens, at an address that does not exist.
 *
 * Bernardo and Oscar are the story, so they stay; the family around them is
 * invented on purpose.
 */
export const FICTIONAL_EVENT: EventDetails = {
  familyName: "Eksempel",
  child: "Bernardo Eksempel",
  birthday: "01.01.2026",
  mother: "Anna Eksempel",
  father: "Jonas Eksempel",
  ceremonyTime: "Lørdag den 1. august 2026 kl. 11:00",
  ceremonyTimeEn: "Saturday 1 August 2026 at 11:00",
  ceremonyTimePt: "Sábado, 1 de agosto de 2026, às 11:00",
  ceremonyPlace: "Eksempel Kirke, Eventyrvej 1, 1234 Eksempelby",
  receptionTime: "Efterfølgende",
  receptionTimeEn: "Straight after the ceremony",
  receptionTimePt: "Logo após a cerimônia",
  receptionPlace: "Eksempel Forsamlingshus, Eventyrvej 7, 1234 Eksempelby",
  rsvpDeadline: "1. juli 2026",
  rsvpDeadlineEn: "1 July 2026",
  rsvpDeadlinePt: "1 de julho de 2026",
  giftList: "https://example.com/wishlist",
};

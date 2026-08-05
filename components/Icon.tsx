"use client";

/**
 * Central Font Awesome icon set. Emojis render inconsistently across platforms
 * and look out of place next to the pixel typography, so every decorative or
 * functional glyph on the site goes through these named icons instead.
 */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faCross,
  faBone,
  faFutbol,
  faPlay,
  faForwardFast,
  faXmark,
  faCheck,
  faHeartCrack,
  faChampagneGlasses,
  faBaby,
  faCakeCandles,
  faPersonBreastfeeding,
  faPersonHalfDress,
  faChurch,
  faLocationDot,
  faClock,
  faUsers,
  faUserCheck,
  faUserXmark,
  faUserClock,
  faUserPlus,
  faTrash,
  faPenToSquare,
  faCopy,
  faFileCsv,
  faRightFromBracket,
  faLock,
  faUser,
  faKey,
  faMusic,
  faVolumeXmark,
  faTrophy,
  faMedal,
  faStar,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faKeyboard,
  faLanguage,
  faTriangleExclamation,
  faSpinner,
  faDog,
  faEnvelopeOpenText,
  faCircleQuestion,
  faSquareCheck,
  faPaperPlane,
  faChild,
} from "@fortawesome/free-solid-svg-icons";

export const ICONS = {
  cross: faCross,
  bone: faBone,
  ball: faFutbol,
  play: faPlay,
  skip: faForwardFast,
  close: faXmark,
  check: faCheck,
  decline: faHeartCrack,
  celebrate: faChampagneGlasses,
  baby: faBaby,
  cake: faCakeCandles,
  mother: faPersonBreastfeeding,
  father: faPersonHalfDress,
  church: faChurch,
  place: faLocationDot,
  time: faClock,
  guests: faUsers,
  attending: faUserCheck,
  declined: faUserXmark,
  pending: faUserClock,
  addGuest: faUserPlus,
  trash: faTrash,
  edit: faPenToSquare,
  copy: faCopy,
  csv: faFileCsv,
  logout: faRightFromBracket,
  lock: faLock,
  user: faUser,
  key: faKey,
  music: faMusic,
  muted: faVolumeXmark,
  trophy: faTrophy,
  medal: faMedal,
  star: faStar,
  left: faArrowLeft,
  right: faArrowRight,
  up: faArrowUp,
  keyboard: faKeyboard,
  language: faLanguage,
  warning: faTriangleExclamation,
  spinner: faSpinner,
  dog: faDog,
  mail: faEnvelopeOpenText,
  question: faCircleQuestion,
  done: faSquareCheck,
  sent: faPaperPlane,
  child: faChild,
} satisfies Record<string, IconProp>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  className?: string;
  spin?: boolean;
  title?: string;
};

export default function Icon({ name, className, spin, title }: Props) {
  return (
    <FontAwesomeIcon icon={ICONS[name]} className={className} spin={spin} title={title} />
  );
}

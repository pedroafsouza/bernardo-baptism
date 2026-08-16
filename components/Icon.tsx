"use client";

/**
 * Central Lucide icon set. Emojis render inconsistently across platforms
 * and look out of place next to the pixel typography, so every decorative or
 * functional glyph on the site goes through these named icons instead.
 */
import {
  Church,
  Bone,
  CircleDot,
  Circle,
  Play,
  FastForward,
  X,
  Check,
  HeartCrack,
  PartyPopper,
  Baby,
  CakeSlice,
  Users as MotherIcon,
  User as FatherIcon,
  Landmark,
  MapPin,
  Clock,
  Users,
  UserCheck,
  UserX,
  UserCog,
  UserPlus,
  Trash2,
  SquarePen,
  Copy,
  FileText,
  LogOut,
  Lock,
  User,
  KeyRound,
  Music,
  VolumeX,
  Trophy,
  Medal,
  Star,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Keyboard,
  Languages,
  TriangleAlert,
  LoaderCircle,
  Dog,
  MailOpen,
  CircleHelp,
  SquareCheck,
  Send,
  PersonStanding,
  Gift,
  CalendarClock,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

export const ICONS = {
  cross: Church,
  bone: Bone,
  ball: CircleDot,
  play: Play,
  skip: FastForward,
  close: X,
  check: Check,
  decline: HeartCrack,
  celebrate: PartyPopper,
  baby: Baby,
  cake: CakeSlice,
  mother: MotherIcon,
  father: FatherIcon,
  church: Landmark,
  place: MapPin,
  time: Clock,
  guests: Users,
  attending: UserCheck,
  declined: UserX,
  pending: UserCog,
  addGuest: UserPlus,
  trash: Trash2,
  edit: SquarePen,
  copy: Copy,
  csv: FileText,
  logout: LogOut,
  lock: Lock,
  user: User,
  key: KeyRound,
  music: Music,
  muted: VolumeX,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  left: ArrowLeft,
  right: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
  keyboard: Keyboard,
  language: Languages,
  warning: TriangleAlert,
  spinner: LoaderCircle,
  dog: Dog,
  mail: MailOpen,
  question: CircleHelp,
  done: SquareCheck,
  sent: Send,
  child: PersonStanding,
  dot: Circle,
  gift: Gift,
  deadline: CalendarClock,
  external: ExternalLink,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  className?: string;
  spin?: boolean;
  title?: string;
};

export default function Icon({ name, className, spin, title }: Props) {
  const LucideIconComponent = ICONS[name];
  return (
    <LucideIconComponent
      className={[className, spin ? "animate-spin" : ""].filter(Boolean).join(" ")}
      aria-label={title}
      role={title ? "img" : undefined}
    />
  );
}

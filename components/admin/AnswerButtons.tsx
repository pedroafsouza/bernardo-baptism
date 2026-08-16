"use client";

import Icon from "@/components/Icon";
import type { AttendeeStatus } from "@/lib/attendees";

/**
 * One person's answer to one half of the day.
 *
 * Pressing the answer somebody already gave takes it back, because an
 * administrator who ticks the wrong box needs a way out of it. The same
 * control is used in the guest table and in the printable report, so an answer
 * behaves identically wherever it is given; in print the buttons give way to
 * the plain word, since paper cannot be clicked.
 */
export default function AnswerButtons({
  said,
  label,
  attendingText,
  declinedText,
  pendingText,
  title,
  onAnswer,
}: {
  said: string;
  label: string;
  attendingText: string;
  declinedText: string;
  pendingText: string;
  title: string;
  onAnswer: (next: AttendeeStatus) => void;
}) {
  const spoken =
    said === "ATTENDING" ? attendingText : said === "DECLINED" ? declinedText : pendingText;

  return (
    <span className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-0.5 print:border-0 print:bg-transparent print:px-0">
      {label}:
      <span className="hidden print:inline">{spoken}</span>
      {(
        [
          ["ATTENDING", "attending", attendingText, "bg-pastel-green"],
          ["DECLINED", "declined", declinedText, "bg-pastel-pink"],
        ] as const
      ).map(([value, icon, text, tone]) => (
        <button
          key={value}
          type="button"
          aria-pressed={said === value}
          title={title}
          onClick={() => onAnswer(said === value ? "PENDING" : value)}
          className={`pixel-btn inline-flex items-center gap-1 border-2 border-black px-1.5 py-0.5 print:hidden ${
            said === value ? tone : "bg-white opacity-50"
          }`}
        >
          <Icon name={icon} className="h-3.5 w-3.5 shrink-0" />
          {text}
        </button>
      ))}
      {said === "PENDING" && (
        <span className="inline-flex items-center gap-1 opacity-70 print:hidden">
          <Icon name="pending" className="h-3.5 w-3.5 shrink-0" />
          {pendingText}
        </span>
      )}
    </span>
  );
}

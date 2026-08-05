"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { copyText } from "@/lib/clipboard";
import { useAdminLang } from "@/lib/adminI18n";
import {
  MESSAGE_CHANNELS,
  MESSAGE_LANGS,
  buildInviteMessage,
  type MessageChannel,
  type MessageLang,
} from "@/lib/invite";

type Props = {
  name: string;
  guestCode: string;
  inviteSent: boolean;
  onToggleSent: (sent: boolean) => void;
  onClose: () => void;
};

export default function InviteMessageModal({
  name,
  guestCode,
  inviteSent,
  onToggleSent,
  onClose,
}: Props) {
  const { t } = useAdminLang();
  const [lang, setLang] = useState<MessageLang>("da");
  const [channel, setChannel] = useState<MessageChannel>("whatsapp");
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const link = useMemo(() => {
    // The invitation is written in one language, so the link opens the game in
    // that same language instead of falling back to Danish.
    const path = `/?code=${encodeURIComponent(guestCode)}&lang=${lang}`;
    return typeof window === "undefined" ? path : `${window.location.origin}${path}`;
  }, [guestCode, lang]);

  const { subject, body } = useMemo(
    () => buildInviteMessage({ name, link, lang, channel }),
    [name, link, lang, channel]
  );

  async function copy(what: "body" | "subject" | "link", text: string) {
    const ok = await copyText(text);
    if (!ok) {
      setCopyError(t.copyFailedShort);
      return;
    }
    setCopyError(null);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(body)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="pixel-border relative w-full max-w-2xl bg-pastel-cream border-4 border-black p-5 max-h-[calc(100dvh-2rem)] overflow-y-auto text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[17px] flex items-center gap-2">
              <Icon name="mail" /> {t.invitationFor(name)}
            </h2>
            <p className="text-[13px] opacity-60 mt-1">{guestCode}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="pixel-btn bg-pastel-pink border-4 border-black w-9 h-9 text-sm shrink-0"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-[14px]">
            <Icon name="language" className="opacity-60 mr-1" />
            {MESSAGE_LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                aria-pressed={lang === l.id}
                className={`pixel-btn border-2 border-black px-2 py-1 ${
                  lang === l.id ? "bg-pastel-green" : "bg-white opacity-70"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[14px]">
            {MESSAGE_CHANNELS.map((c) => (
              <button
                key={c.id}
                onClick={() => setChannel(c.id)}
                aria-pressed={channel === c.id}
                className={`pixel-btn border-2 border-black px-2 py-1 ${
                  channel === c.id ? "bg-pastel-blue" : "bg-white opacity-70"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {channel === "email" && (
          <div className="mb-3">
            <label className="block text-[13px] mb-1 opacity-70">{t.subject}</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={subject}
                className="flex-1 border-4 border-black p-2 text-[14px] bg-white"
              />
              <button
                onClick={() => copy("subject", subject)}
                className="pixel-btn bg-pastel-yellow border-4 border-black px-3 text-[14px] shrink-0 flex items-center gap-1"
              >
                <Icon name="copy" /> {copied === "subject" ? t.copied : t.copy}
              </button>
            </div>
          </div>
        )}

        <label className="block text-[13px] mb-1 opacity-70">{t.messageLabel}</label>
        <textarea
          readOnly
          value={body}
          rows={16}
          className="w-full border-4 border-black p-3 text-[14px] leading-relaxed bg-white whitespace-pre-wrap"
        />

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => copy("body", body)}
            className="pixel-btn bg-pastel-green border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
          >
            <Icon name="copy" /> {copied === "body" ? t.copied : t.copyMessage}
          </button>
          <button
            onClick={() => copy("link", link)}
            className="pixel-btn bg-pastel-blue border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
          >
            <Icon name="copy" /> {copied === "link" ? t.copied : t.copyLinkOnly}
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="pixel-btn bg-white border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
          >
            <Icon name="sent" /> {t.openWhatsApp}
          </a>
          <a
            href={mailHref}
            className="pixel-btn bg-white border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
          >
            <Icon name="mail" /> {t.openEmail}
          </a>
        </div>

        {copyError && (
          <p className="mt-2 text-red-600 text-[14px] flex items-center gap-2">
            <Icon name="warning" /> {copyError}
          </p>
        )}

        <label className="mt-4 flex items-center gap-2 text-[14px] cursor-pointer bg-white border-4 border-black p-3">
          <input
            type="checkbox"
            checked={inviteSent}
            onChange={(e) => onToggleSent(e.target.checked)}
            className="w-4 h-4"
          />
          <Icon name={inviteSent ? "done" : "pending"} />
          {t.invitationSentTo(name)}
        </label>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import InvitationApp from "@/components/InvitationApp";
import { prisma } from "@/lib/prisma";
import { demoGuest, isDemoCode } from "@/lib/demo";
import { safeId } from "@/lib/security";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/lang";
import { inviteMeta } from "@/lib/inviteMeta";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The household behind a link, for the preview card only.
 *
 * A missing guest, an unreadable code or a database that is having a bad day
 * all mean the same thing here: a card without a name, never a broken page.
 */
async function householdName(code: string | undefined): Promise<string | null> {
  const guestCode = safeId(code);
  if (!guestCode) return null;
  if (isDemoCode(guestCode)) return demoGuest().name;

  try {
    const guest = await prisma.guest.findUnique({
      where: { guestCode },
      select: { name: true },
    });
    return guest?.name ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const param = first(params.lang);
  const lang: Lang = isLang(param) ? param : DEFAULT_LANG;
  const code = first(params.code);
  // The demo link is shared in the open, so its preview card names no real
  // church and no real hour either.
  const meta = inviteMeta(lang, await householdName(code), isDemoCode(safeId(code)));

  return {
    // Absolute: the household's own name is the headline, not a suffix on the
    // site-wide title template.
    title: { absolute: meta.title },
    description: meta.description,
    openGraph: {
      type: "website",
      siteName: meta.siteName,
      title: meta.title,
      description: meta.description,
      url: "/",
      locale: meta.locale,
      alternateLocale: meta.alternateLocales,
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function Page() {
  return <InvitationApp />;
}

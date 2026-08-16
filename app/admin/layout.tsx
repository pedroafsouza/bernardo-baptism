import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * The whole administration — the guest list and the printable report — is set
 * in a reading font rather than the invitation's pixel face.
 *
 * The guests see a pixel game, and the pixel lettering is part of it. Whoever
 * runs the day is doing something else entirely: scanning a hundred household
 * names, allergy notes and audit lines, often on a phone. The wrapper lives
 * here so that switch happens once for every page under /admin and can never be
 * forgotten on a new one — and so nothing about the guest-facing invitation
 * changes.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-ui">{children}</div>;
}

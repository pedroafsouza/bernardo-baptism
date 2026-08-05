import type { Metadata, Viewport } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

// Next.js injects the Font Awesome stylesheet above, so the library must not
// also inject it at runtime (that causes flashing oversized icons).
config.autoAddCss = false;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bernardo-baptism.vercel.app";

const title = "Bernardos barnedåb";
const description =
  "Bernardo Freitas de Souza bliver døbt den 3. oktober 2026. Hjælp bjørnen Bernardo og hunden Oscar med at nå kirken i et lille pixel-spil — og svar på invitationen ved målstregen.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s · ${title}`,
  },
  description,
  applicationName: title,
  keywords: [
    "barnedåb",
    "christening",
    "baptism",
    "Bernardo",
    "invitation",
    "RSVP",
    "3. oktober 2026",
  ],
  authors: [{ name: "Familien Freitas de Souza" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: title,
    title,
    description,
    url: "/",
    locale: "da_DK",
    alternateLocale: ["en_GB"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#bcd8f0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

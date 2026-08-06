import type { Metadata } from "next";
import { Geist, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Cinzel = engraved, Roman-capital feel — fits AoE4's illuminated/medieval look.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  // Absolute, because a relative OG image is not fetched by anything rendering a
  // link preview — the card just loses its picture, silently.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "AoE4 Ban/Pick — Tournament Drafting",
    // Pages set their own title and inherit the suffix, so every tab says which
    // site it belongs to without each page repeating it.
    template: "%s · AoE4 Ban/Pick",
  },
  description:
    "Build and run Age of Empires IV tournament drafts: civilization and map ban/pick, hidden offers and snipes, per-step timers, and a broadcast view for spectators.",
  applicationName: "AoE4 Ban/Pick",
  openGraph: {
    type: "website",
    siteName: "AoE4 Ban/Pick",
    title: "AoE4 Ban/Pick — Tournament Drafting",
    description: "Civilization and map ban/pick for Age of Empires IV, with live spectating.",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

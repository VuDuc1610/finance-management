import type { Metadata } from "next";
import { Fraunces, Karla, IBM_Plex_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Zen Linen — Finance Dashboard",
  description: "A calm, soothing home for looking at your money.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

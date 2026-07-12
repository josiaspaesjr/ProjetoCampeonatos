import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Teko } from "next/font/google";
import { IdiomaProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const teko = Teko({
  variable: "--font-teko",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "BJJArena — Campeonatos de Jiu-Jitsu",
    template: "%s · BJJArena",
  },
  description:
    "Inscrições com Pix, chaves automáticas, cronograma ao vivo e placar digital para campeonatos de Jiu-Jitsu.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${barlow.variable} ${barlowCondensed.variable} ${teko.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <IdiomaProvider locale={locale}>{children}</IdiomaProvider>
      </body>
    </html>
  );
}

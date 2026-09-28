import type { Metadata, Viewport } from "next";
import { PT_Sans, Volkhov } from "next/font/google";

import { siteConfig } from "@/config/site";

import "./globals.css";

const ptSans = PT_Sans({ variable: "--font-pt-sans", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const volkhov = Volkhov({ variable: "--font-volkhov", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url), title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` }, description: siteConfig.description,
  robots: siteConfig.isReview ? { index: false, follow: false, nocache: true } : undefined,
  alternates: { canonical: "/" }, openGraph: { type: "website", locale: siteConfig.locale, siteName: siteConfig.name, title: siteConfig.title, description: siteConfig.description, url: "/" },
};
export const viewport: Viewport = { themeColor: "#0079BE" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html className={`${ptSans.variable} ${volkhov.variable}`} data-scroll-behavior="smooth" lang={siteConfig.language}><body className="min-w-80 antialiased">{children}</body></html>;
}

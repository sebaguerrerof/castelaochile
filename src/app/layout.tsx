import type { Metadata, Viewport } from "next";
import { Noto_Serif, PT_Sans, Volkhov } from "next/font/google";

import { SHARE_IMAGE_PATH, defaultShareImage } from "@/lib/share-image";
import { siteConfig } from "@/config/site";

import "./globals.css";

const ptSans = PT_Sans({ variable: "--font-pt-sans", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const volkhov = Volkhov({ variable: "--font-volkhov", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
// Successor of Droid Serif (the manual's gallery face). Not preloaded: only captions and galleries use it.
const notoSerif = Noto_Serif({ variable: "--font-noto-serif", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url), title: { default: siteConfig.title, template: `%s | ${siteConfig.name}` }, description: siteConfig.description,
  robots: siteConfig.isReview ? { index: false, follow: false, nocache: true } : undefined,
  alternates: { canonical: "/" }, openGraph: { type: "website", locale: siteConfig.locale, siteName: siteConfig.name, title: siteConfig.title, description: siteConfig.description, url: "/", images: [defaultShareImage(siteConfig.name)] },
  twitter: { card: "summary_large_image", images: [SHARE_IMAGE_PATH] },
  appleWebApp: { capable: true, title: "Castelao Chile", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0079BE", viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html className={`${ptSans.variable} ${volkhov.variable} ${notoSerif.variable}`} data-scroll-behavior="smooth" lang={siteConfig.language}><body className="min-w-80 antialiased">{children}</body></html>;
}

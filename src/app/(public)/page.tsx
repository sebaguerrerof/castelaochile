import type { Metadata } from "next";

import { Hero } from "@/components/home/hero";
import { HomeOverview } from "@/components/home/home-overview";
import { LegacyHashRedirect } from "@/components/home/legacy-hash-redirect";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Instituto Castelao Chile",
  description:
    "Información institucional de Instituto Castelao Chile. Un espacio digital de orientación general y contenido en proceso de validación local.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <LegacyHashRedirect />
      <Hero />
      <HomeOverview />
    </>
  );
}
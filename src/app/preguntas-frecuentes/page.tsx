import type { Metadata } from "next";

import { FaqGroups } from "@/components/faq/faq-groups";
import { Section } from "@/components/layout/section";
import { CTASection } from "@/components/shared/cta-section";
import { PageHero } from "@/components/shared/page-hero";
import { institutionalPages } from "@/content/pages";
import { createPageMetadata } from "@/lib/page-metadata";

const page = institutionalPages.faq;

export const metadata: Metadata = createPageMetadata(page);

export default function FaqPage() {
  return (
    <>
      <PageHero {...page} current={page.label} />
      <Section><FaqGroups /></Section>
      <CTASection description="El formulario se puede revisar sin enviar información. Los canales oficiales se incorporarán en una única configuración tras su validación." eyebrow="Contacto" href="/contacto" label="Ir a contacto" title="Consulta el estado del contacto" />
    </>
  );
}
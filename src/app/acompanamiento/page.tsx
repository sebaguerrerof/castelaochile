import { Info } from "lucide-react";
import type { Metadata } from "next";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { CTASection } from "@/components/shared/cta-section";
import { EditorialImage } from "@/components/shared/editorial-image";
import { FeatureCard } from "@/components/shared/feature-card";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section-heading";
import { homeContent, treatmentCards } from "@/content/home";
import { institutionalPages } from "@/content/pages";
import { createPageMetadata } from "@/lib/page-metadata";

const page = institutionalPages.accompaniment;

export const metadata: Metadata = createPageMetadata(page);

export default function AccompanimentPage() {
  return (
    <>
      <PageHero {...page} current={page.label} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-16">
          <Reveal origin="left">
            <div className="image-composition image-composition--approach">
              <EditorialImage asset={page.image} className="h-[24rem] sm:h-[30rem]" sizes="(max-width: 1023px) 100vw, 40vw" />
              <p className="image-composition__caption">El valor de contar con un entorno cuidado</p>
            </div>
          </Reveal>
          <Reveal delay="sm" origin="right">
            <SectionHeading description="La información se organiza para abrir una conversación con prudencia. Las modalidades, prestaciones y equipos específicos para Chile se publicarán solo tras validación institucional." eyebrow="Acompañamiento" title="Orientación general, sin promesas ni diagnósticos" />
          </Reveal>
        </div>
      </Section>
      <Section className="bg-muted">
        <div className="grid gap-5 md:grid-cols-3">
          {treatmentCards.map((card, index) => (
            <Reveal delay={index === 0 ? "none" : index === 1 ? "sm" : "md"} key={card.id}><FeatureCard {...card} variant="editorial" /></Reveal>
          ))}
        </div>
        <p className="mt-8 flex max-w-3xl gap-3 rounded-lg border border-primary/20 bg-surface px-5 py-4 text-sm leading-6 text-muted-foreground"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />{homeContent.accompaniment.note}</p>
      </Section>
      <CTASection description="Descubre los principios que dan forma al lenguaje y a la experiencia de lectura de este sitio institucional." eyebrow="Nuestro enfoque" href="/nuestro-enfoque" label="Conocer el enfoque" title="Poner a las personas antes que las etiquetas" />
    </>
  );
}
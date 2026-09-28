import type { Metadata } from "next";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { CTASection } from "@/components/shared/cta-section";
import { FeatureCard } from "@/components/shared/feature-card";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section-heading";
import { homeContent, valueCards } from "@/content/home";
import { institutionalPages } from "@/content/pages";
import { createPageMetadata } from "@/lib/page-metadata";

const page = institutionalPages.approach;

export const metadata: Metadata = createPageMetadata(page);

export default function ApproachPage() {
  return (
    <>
      <PageHero {...page} current={page.label} />
      <Section>
        <div className="values-layout grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
          <Reveal origin="left">
            <SectionHeading description={homeContent.values.description} eyebrow="Principios" title="Una mirada centrada en las personas" />
            <p aria-hidden="true" className="values-layout__index">01 — 04</p>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {valueCards.map((card, index) => <Reveal delay={index % 2 === 0 ? "sm" : "md"} key={card.id}><FeatureCard eyebrow={`0${index + 1}`} {...card} /></Reveal>)}
          </div>
        </div>
      </Section>
      <Section className="approach-note bg-surface-muted">
        <Reveal><p>La información disponible en esta etapa es editorial y general. No reemplaza una evaluación profesional individual ni permite inferir prestaciones, resultados o disponibilidad local.</p></Reveal>
      </Section>
      <CTASection description="Un capítulo breve para quienes acompañan y buscan una forma respetuosa de comenzar a informarse." eyebrow="Personas cercanas" href="/familias" label="Ir a familias" title="Cuando las preguntas también se comparten" />
    </>
  );
}
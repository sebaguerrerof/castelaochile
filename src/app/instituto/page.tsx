import { BadgeCheck, Compass } from "lucide-react";
import type { Metadata } from "next";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { CTASection } from "@/components/shared/cta-section";
import { EditorialImage } from "@/components/shared/editorial-image";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section-heading";
import { institutionalPages } from "@/content/pages";
import { createPageMetadata } from "@/lib/page-metadata";

const page = institutionalPages.institute;

export const metadata: Metadata = createPageMetadata(page);

export default function InstitutePage() {
  return (
    <>
      <PageHero {...page} current={page.label} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
          <Reveal origin="left">
            <SectionHeading
              description="Instituto Castelao Chile desarrolla este espacio para hacer accesible la información institucional que pueda ser compartida con claridad y responsabilidad."
              eyebrow="Presentación"
              title="Antes de avanzar, escuchar"
            />
            <aside className="editorial-quote mt-9">
              <span className="editorial-quote__icon"><Compass aria-hidden="true" className="size-5" /></span>
              <blockquote className="editorial-quote__copy">“Cada historia requiere escucha, respeto y una mirada atenta a la realidad de cada persona.”</blockquote>
              <div className="editorial-quote__meta"><BadgeCheck aria-hidden="true" className="size-5" /><span>Principio editorial</span></div>
            </aside>
          </Reveal>
          <Reveal delay="sm" origin="right">
            <div className="image-composition image-composition--institute">
              <EditorialImage asset={page.image} className="h-[26rem] sm:h-[34rem] lg:h-[38rem]" sizes="(max-width: 1023px) 100vw, 52vw" />
              <p className="image-composition__caption">Una atmósfera pensada para recibir</p>
            </div>
          </Reveal>
        </div>
      </Section>
      <CTASection description="Conoce cómo se presenta la orientación general en esta etapa, sin asumir servicios, modalidades ni datos locales que aún no estén confirmados." eyebrow="Siguiente capítulo" href="/acompanamiento" label="Ver acompañamiento" title="Información para comprender el contexto" />
    </>
  );
}
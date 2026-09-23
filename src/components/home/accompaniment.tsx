import { Info } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { assets } from "@/config/assets";
import { homeContent, treatmentCards } from "@/content/home";

import { Section } from "@/components/layout/section";
import { EditorialImage } from "@/components/shared/editorial-image";
import { FeatureCard } from "@/components/shared/feature-card";
import { SectionHeading } from "@/components/shared/section-heading";

export function Accompaniment() {
  return (
    <Section className="bg-muted" id="acompanamiento">
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-16">
        <Reveal origin="left">
          <div className="image-composition image-composition--approach">
            <EditorialImage
              asset={assets.images.accompaniment}
              className="h-[24rem] sm:h-[30rem]"
              sizes="(max-width: 1023px) 100vw, 40vw"
            />
            <p className="image-composition__caption">El valor de contar con un entorno cuidado</p>
          </div>
        </Reveal>
        <Reveal delay="sm" origin="right">
          <SectionHeading
            description={homeContent.accompaniment.description}
            eyebrow={homeContent.accompaniment.eyebrow}
            title={homeContent.accompaniment.title}
          />
        </Reveal>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {treatmentCards.map((card, index) => (
          <Reveal delay={index === 0 ? "none" : index === 1 ? "sm" : "md"} key={card.id}>
            <FeatureCard {...card} variant="editorial" />
          </Reveal>
        ))}
      </div>
      <p className="mt-8 flex max-w-3xl gap-3 rounded-lg border border-primary/20 bg-surface px-5 py-4 text-sm leading-6 text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        {homeContent.accompaniment.note}
      </p>
    </Section>
  );
}

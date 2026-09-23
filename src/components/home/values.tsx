import { homeContent, valueCards } from "@/content/home";

import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/layout/section";
import { FeatureCard } from "@/components/shared/feature-card";
import { SectionHeading } from "@/components/shared/section-heading";

export function Values() {
  return (
    <Section id="como-trabajamos">
      <div className="values-layout grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
        <Reveal origin="left">
          <SectionHeading
            description={homeContent.values.description}
            eyebrow={homeContent.values.eyebrow}
            title={homeContent.values.title}
          />
          <p aria-hidden="true" className="values-layout__index">01 — 04</p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          {valueCards.map((card, index) => (
            <Reveal delay={index % 2 === 0 ? "sm" : "md"} key={card.id}>
              <FeatureCard eyebrow={`0${index + 1}`} {...card} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

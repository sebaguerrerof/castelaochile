import { BadgeCheck, Compass } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { assets } from "@/config/assets";
import { homeContent } from "@/content/home";

import { Section } from "@/components/layout/section";
import { EditorialImage } from "@/components/shared/editorial-image";
import { SectionHeading } from "@/components/shared/section-heading";

export function About() {
  return (
    <Section id="instituto">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
        <Reveal origin="left">
          <SectionHeading
            description={homeContent.about.description}
            eyebrow={homeContent.about.eyebrow}
            title={homeContent.about.title}
          />
          <aside className="editorial-quote mt-9">
            <span className="editorial-quote__icon">
              <Compass aria-hidden="true" className="size-5" />
            </span>
            <blockquote className="editorial-quote__copy">“{homeContent.about.quote}”</blockquote>
            <div className="editorial-quote__meta">
              <BadgeCheck aria-hidden="true" className="size-5" />
              <span>Principio editorial</span>
            </div>
          </aside>
        </Reveal>
        <Reveal delay="sm" origin="right">
          <div className="image-composition image-composition--institute">
            <EditorialImage
              asset={assets.images.institute}
              className="h-[26rem] sm:h-[34rem] lg:h-[38rem]"
              sizes="(max-width: 1023px) 100vw, 52vw"
            />
            <p className="image-composition__caption">Una atmósfera pensada para recibir</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

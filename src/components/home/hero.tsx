import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { assets } from "@/config/assets";
import { homeContent } from "@/content/home";

import { Container } from "@/components/layout/container";
import { EditorialImage } from "@/components/shared/editorial-image";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="hero-scene relative isolate overflow-hidden text-primary-foreground" id="inicio">
      <div aria-hidden="true" className="hero-grid absolute inset-0" />
      <div aria-hidden="true" className="hero-orbit" />
      <Container className="relative grid min-h-[40rem] items-center gap-10 py-10 sm:py-14 md:grid-cols-[0.96fr_1.04fr] md:gap-8 lg:min-h-[44rem] lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:py-16">
        <div className="hero-entry hero-entry--copy order-1 max-w-2xl lg:py-10">
          <p className="hero-entry__item hero-entry__item--eyebrow eyebrow mb-5 text-primary-foreground/75">{homeContent.hero.eyebrow}</p>
          <h1 className="hero-entry__item hero-entry__item--title max-w-3xl font-heading text-4xl font-bold tracking-[-0.05em] sm:text-6xl lg:text-[4.45rem] lg:leading-[0.98]">
            {homeContent.hero.title}
          </h1>
          <p className="hero-entry__item hero-entry__item--description mt-6 max-w-xl text-lg leading-8 text-primary-foreground/85 sm:text-xl">
            {homeContent.hero.description}
          </p>
          <div className="hero-entry__item hero-entry__item--actions mt-8 flex flex-wrap gap-3">
            <Link
              className={buttonVariants({ variant: "inverted", size: "lg" })}
              href="/nuestro-enfoque"
            >
              {homeContent.hero.cta.label}
              <ArrowDownRight aria-hidden="true" className="size-5" />
            </Link>
            <Link
              className="button-motion inline-flex min-h-12 items-center gap-2 rounded-full border border-primary-foreground/45 px-6 py-3 font-nav text-sm font-bold tracking-[0.04em] text-primary-foreground hover:bg-primary-foreground/10"
              href="/contacto"
            >
              Ver contacto <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <div className="hero-entry hero-entry--delayed order-2 md:justify-self-end">
          <div className="hero-image-shell">
            <EditorialImage
              asset={assets.images.hero}
              className="h-[18rem] w-full sm:h-[23rem] md:h-[28rem] md:w-[min(43vw,28rem)] lg:h-[34rem] lg:w-[min(43vw,36rem)]"
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              tone="hero"
            />
            <span aria-hidden="true" className="hero-image-shell__line" />
            <p className="hero-image-shell__caption">Espacios para estar y conversar</p>
          </div>
        </div>
        <Link className="hero-scroll-cue hidden md:flex" href="/instituto">
          <span aria-hidden="true" /> Descubre el instituto
        </Link>
      </Container>
    </section>
  );
}
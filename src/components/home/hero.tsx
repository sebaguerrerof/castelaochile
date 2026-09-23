import { ArrowDownRight } from "lucide-react";

import { assets } from "@/config/assets";
import { contactConfig } from "@/config/contact";
import { homeContent } from "@/content/home";
import { getContactActions } from "@/lib/contact-links";
import { getContactFormMode } from "@/lib/server/contact-runtime";

import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { ContactActionLink } from "@/components/shared/contact-actions";
import { EditorialImage } from "@/components/shared/editorial-image";

export function Hero() {
  const primaryContactAction = getContactActions(contactConfig)[0];
  const contactFormIsActive = getContactFormMode() === "active";

  return (
    <section className="hero-scene relative isolate overflow-hidden text-primary-foreground" id="inicio">
      <div aria-hidden="true" className="hero-grid absolute inset-0" />
      <div aria-hidden="true" className="hero-orbit" />
      <Container className="relative grid min-h-[40rem] items-center gap-10 py-10 sm:py-14 md:grid-cols-[0.96fr_1.04fr] md:gap-8 lg:min-h-[44rem] lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:py-16">
        <div className="hero-entry order-1 max-w-2xl lg:py-10">
          <p className="eyebrow mb-5 text-primary-foreground/75">
            {homeContent.hero.eyebrow}
          </p>
          <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-[-0.05em] sm:text-6xl lg:text-[4.45rem] lg:leading-[0.98]">
            {homeContent.hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/85 sm:text-xl">
            {homeContent.hero.description}
          </p>
          {primaryContactAction ? (
            <ContactActionLink
              action={primaryContactAction}
              className="mt-8"
              variant="inverted"
            />
          ) : (
            <LinkButton
              className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              href={contactFormIsActive ? "#contacto" : homeContent.hero.cta.href}
              size="lg"
            >
              {contactFormIsActive ? "Escríbenos" : homeContent.hero.cta.label}
              <ArrowDownRight aria-hidden="true" className="size-5" />
            </LinkButton>
          )}
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
        <a className="hero-scroll-cue hidden md:flex" href="#instituto">
          <span aria-hidden="true" /> Descubre el instituto
        </a>
      </Container>
    </section>
  );
}

import { MailQuestion, ShieldCheck } from "lucide-react";

import { ContactForm } from "@/components/contact/contact-form";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { ContactActions } from "@/components/shared/contact-actions";
import { EditorialImage } from "@/components/shared/editorial-image";
import { SectionHeading } from "@/components/shared/section-heading";
import { assets } from "@/config/assets";
import { contactConfig } from "@/config/contact";
import { homeContent } from "@/content/home";
import { getContactActions } from "@/lib/contact-links";

export function Contact() {
  const actions = getContactActions(contactConfig);

  return (
    <Section id="contacto">
      <div className="contact-scene overflow-hidden rounded-[var(--radius-xl)]">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <Reveal className="contact-scene__content" origin="left">
            <SectionHeading
              description={homeContent.contact.description}
              eyebrow={homeContent.contact.eyebrow}
              inverted
              title={homeContent.contact.title}
            />
            {actions.length > 0 ? (
              <div className="mt-8">
                <ContactActions actions={actions} variant="inverted" />
              </div>
            ) : (
              <div className="contact-scene__assurance">
                <ShieldCheck aria-hidden="true" className="size-5" />
                <span>Los datos de contacto se publicarán solo después de validación institucional.</span>
              </div>
            )}
            <EditorialImage
              asset={assets.images.contact}
              className="contact-scene__supporting-image mt-8 h-[12rem] sm:h-[15rem]"
              sizes="(max-width: 1023px) 100vw, 35vw"
            />
          </Reveal>
          <Reveal className="contact-scene__form-area" delay="sm" origin="right">
            <div className="contact-form__demo-wrap">
              <MailQuestion aria-hidden="true" className="contact-form__demo-icon size-5" />
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
import { MailQuestion, ShieldCheck } from "lucide-react";

import { ContactForm } from "@/components/contact/contact-form";
import { Reveal } from "@/components/motion/reveal";
import { assets } from "@/config/assets";
import { contactConfig } from "@/config/contact";
import { contactFormConfig } from "@/config/contact-form";
import { getContactActions } from "@/lib/contact-links";
import { getContactFormMode } from "@/lib/server/contact-runtime";
import { homeContent } from "@/content/home";

import { Section } from "@/components/layout/section";
import { ContactActions } from "@/components/shared/contact-actions";
import { EditorialImage } from "@/components/shared/editorial-image";
import { SectionHeading } from "@/components/shared/section-heading";

export function Contact() {
  const actions = getContactActions(contactConfig);
  const formMode = getContactFormMode();

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
                <span>No se publican datos de contacto sin validación institucional.</span>
              </div>
            )}
            <EditorialImage
              asset={assets.images.contact}
              className="contact-scene__supporting-image mt-8 h-[12rem] sm:h-[15rem]"
              sizes="(max-width: 1023px) 100vw, 35vw"
            />
          </Reveal>
          <Reveal className="contact-scene__form-area" delay="sm" origin="right">
            {formMode === "unavailable" ? (
              <div className="contact-status" role="status">
                <MailQuestion aria-hidden="true" className="size-7 text-primary" />
                <h3>{contactFormConfig.copy.unavailableTitle}</h3>
                <p>{contactFormConfig.copy.unavailableDescription}</p>
              </div>
            ) : (
              <ContactForm mode={formMode} privacyPolicyUrl={contactFormConfig.privacyPolicyUrl} />
            )}
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { Contact } from "@/components/home/contact";
import { Section } from "@/components/layout/section";
import { PageHero } from "@/components/shared/page-hero";
import { institutionalPages } from "@/content/pages";
import { createPageMetadata } from "@/lib/page-metadata";

const page = institutionalPages.contact;

export const metadata: Metadata = createPageMetadata(page);

export default function ContactPage() {
  return (
    <>
      <PageHero {...page} current={page.label} />
      <Contact />
      <Section className="bg-muted">
        <div className="contact-readiness">
          <div><p className="eyebrow text-primary">Próxima activación</p><h2>Condiciones para habilitar el envío real</h2></div>
          <ul>
            <li><CheckCircle2 aria-hidden="true" /> Política de privacidad y texto de consentimiento aprobados.</li>
            <li><CheckCircle2 aria-hidden="true" /> Buzón receptor, remitente y credenciales del proveedor verificados.</li>
            <li><ShieldCheck aria-hidden="true" /> Protección antiabuso y rate limiting compartido configurados.</li>
            <li><CheckCircle2 aria-hidden="true" /> Prueba end-to-end con datos no sensibles completada.</li>
          </ul>
        </div>
      </Section>
    </>
  );
}
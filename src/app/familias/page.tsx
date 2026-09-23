import { CircleHelp, HeartHandshake, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { CTASection } from "@/components/shared/cta-section";
import { FeatureCard } from "@/components/shared/feature-card";
import { PageHero } from "@/components/shared/page-hero";
import { SectionHeading } from "@/components/shared/section-heading";
import { institutionalPages } from "@/content/pages";
import { createPageMetadata } from "@/lib/page-metadata";

const page = institutionalPages.families;
const familyCards = [
  { icon: MessagesSquare, title: "Abrir una conversación", description: "Dar espacio a las preguntas sin suponer respuestas ni reducir a una persona a una situación." },
  { icon: HeartHandshake, title: "Cuidar el vínculo", description: "Reconocer que cada historia, relación y ritmo merece respeto al momento de buscar orientación." },
  { icon: CircleHelp, title: "Buscar información confiable", description: "Distinguir entre contenido general y la orientación profesional que corresponde a cada contexto." },
];

export const metadata: Metadata = createPageMetadata(page);

export default function FamiliesPage() {
  return (
    <>
      <PageHero {...page} current={page.label} />
      <Section>
        <Reveal><SectionHeading align="center" description="Acompañar a una persona cercana puede abrir muchas dudas. Este espacio no ofrece un programa familiar ni respuestas clínicas: propone una lectura breve, humana y prudente." eyebrow="Orientación editorial" title="Estar cerca también requiere escucha" /></Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {familyCards.map((card, index) => <Reveal delay={index === 0 ? "none" : index === 1 ? "sm" : "md"} key={card.title}><FeatureCard {...card} variant="editorial" /></Reveal>)}
        </div>
      </Section>
      <Section className="bg-muted"><div className="family-note"><p className="eyebrow text-primary">Importante</p><p>Este sitio no es un canal de urgencias. Frente a una situación inmediata, busca apoyo mediante los servicios de emergencia o de salud disponibles en tu localidad.</p></div></Section>
      <CTASection description="Encuentra respuestas transparentes sobre el alcance actual del sitio y los canales que aún están en preparación." eyebrow="Preguntas frecuentes" href="/preguntas-frecuentes" label="Ver preguntas frecuentes" title="Más claridad para avanzar informado" />
    </>
  );
}
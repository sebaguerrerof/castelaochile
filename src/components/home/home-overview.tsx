import { Reveal } from "@/components/motion/reveal";
import { CTASection } from "@/components/shared/cta-section";
import { PageLinkCard } from "@/components/shared/page-link-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Section } from "@/components/layout/section";
import { homePageLinks } from "@/content/pages";

export function HomeOverview() {
  return (
    <>
      <Section className="home-introduction">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <Reveal origin="left">
            <SectionHeading
              description="Una experiencia institucional más ordenada para revisar la información disponible, entender sus límites y encontrar cada tema con facilidad."
              eyebrow="Instituto Castelao Chile"
              title="Información para orientarse con calma"
            />
          </Reveal>
          <Reveal delay="sm" origin="right">
            <p className="home-introduction__statement">
              Este sitio no reemplaza una conversación profesional ni publica prestaciones, datos de contacto o información local que aún no haya sido validada.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-muted" containerClassName="home-paths">
        <Reveal>
          <SectionHeading
            align="center"
            description="Cada sección tiene un propósito propio para evitar repetir contenidos y facilitar la navegación."
            eyebrow="Recorre el sitio"
            title="Una mirada en capítulos"
          />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {homePageLinks.map((item, index) => (
            <Reveal delay={index % 3 === 0 ? "none" : index % 3 === 1 ? "sm" : "md"} key={item.href}>
              <PageLinkCard {...item} id={item.anchor} />
            </Reveal>
          ))}
        </div>
      </Section>

      <CTASection
        description="Revisa los canales en preparación y el formulario visible de demostración. No se enviará ni guardará información desde esta etapa."
        eyebrow="Contacto"
        href="/contacto"
        label="Ir a contacto"
        title="Una experiencia de contacto transparente"
      />
    </>
  );
}
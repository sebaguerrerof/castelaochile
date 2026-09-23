import { faqItems } from "@/content/faq";

import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/shared/section-heading";

export function Faq() {
  return (
    <Section className="bg-surface-muted" id="preguntas-frecuentes">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <SectionHeading
            description="Respuestas breves para entender el alcance de esta primera versión institucional."
            eyebrow="Preguntas frecuentes"
            title="Información clara desde el inicio"
          />
        </Reveal>
        <Reveal delay="sm">
          <Accordion className="faq-panel border-t border-border" collapsible type="single">
            {faqItems.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Section>
  );
}

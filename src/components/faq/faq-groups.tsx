import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems, faqTopics } from "@/content/faq";

export function FaqGroups() {
  return (
    <div className="grid gap-8">
      {faqTopics.map((topic) => {
        const items = faqItems.filter((item) => item.topic === topic.id);
        if (items.length === 0) return null;

        return (
          <section className="faq-topic" key={topic.id}>
            <div>
              <p className="eyebrow text-primary">{topic.eyebrow}</p>
              <h2>{topic.title}</h2>
            </div>
            <Accordion className="faq-panel mt-4 border-t border-border" collapsible type="single">
              {items.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        );
      })}
    </div>
  );
}
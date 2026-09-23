import { About } from "@/components/home/about";
import { Accompaniment } from "@/components/home/accompaniment";
import { Contact } from "@/components/home/contact";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { Values } from "@/components/home/values";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Accompaniment />
      <Values />
      <Faq />
      <Contact />
    </>
  );
}

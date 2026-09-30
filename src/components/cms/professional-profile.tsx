import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail, Phone, Quote } from "lucide-react";
import { SafeHtml } from "@/components/content/safe-html";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd, ProfessionalIdentity } from "@/components/cms/cms-page";
import { safeHref } from "@/lib/cms/schemas";
import { siteConfig } from "@/config/site";
import type { ProfessionalRow } from "@/types/cms";

export function ProfessionalProfile({ person }: { person: ProfessionalRow }) {
  const experiences = [["Biografía", person.bio], ["Experiencia profesional", person.professional_experience], ["Experiencia de recuperación", person.recovery_experience]];
  const social = [{ label: "LinkedIn", url: person.linkedin_url }, { label: "Instagram", url: person.instagram_url }].filter((item) => item.url && safeHref.safeParse(item.url).success);
  return <div className="cms-page professional-profile">
    <section className="professional-hero"><Container>
      <Link className="professional-hero__back" href="/equipo"><ArrowLeft size={16} />Nuestro equipo</Link>
      <div className="professional-hero__grid"><ProfessionalIdentity person={person} /><div className="professional-hero__copy"><p className="eyebrow">{person.role}</p><h1>{person.full_name}</h1>{person.credentials.length > 0 && <ul>{person.credentials.map((credential) => <li key={credential}>{credential}</li>)}</ul>}{person.short_bio && <p className="professional-hero__bio">{person.short_bio}</p>}</div></div>
    </Container></section>
    {experiences.map(([title, html]) => html ? <Section className="cms-section professional-section" key={title}><div className="cms-editorial"><h2 className="professional-section__heading">{title}</h2><div className="cms-prose"><SafeHtml value={html} /></div></div></Section> : null)}
    {person.featured_quote && <Section className="professional-quote"><div><Quote aria-hidden="true" size={36} /><blockquote>“{person.featured_quote}”</blockquote><p>{person.full_name}</p></div></Section>}
    {(person.media || person.conferences) && <Section className="cms-section"><div className="professional-activities">{[["Participación en medios", person.media], ["Charlas y conferencias", person.conferences]].map(([title, value]) => value ? <article key={title}><span className="professional-activities__line" /><h2>{title}</h2><p>{value}</p></article> : null)}</div></Section>}
    <Section className="professional-contact"><div className="professional-contact__inner"><Link className="public-text-link" href="/equipo"><ArrowLeft size={17} />Volver al equipo</Link><div>{person.cta_label && safeHref.safeParse(person.cta_url).success && <a className={buttonVariants({ className: "public-button" })} href={person.cta_url}>{person.cta_label}<ArrowUpRight size={18} /></a>}{person.email && <a className="public-text-link" href={"mailto:" + person.email}><Mail size={17} />Correo</a>}{person.phone && <a className="public-text-link" href={"tel:" + person.phone}><Phone size={17} />Teléfono</a>}{social.map((item) => <a className="public-text-link" href={item.url} key={item.url} rel="noopener noreferrer" target="_blank">{item.label}<ArrowUpRight size={17} /></a>)}</div></div></Section>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Person", name: person.full_name, jobTitle: person.role, description: person.short_bio, url: new URL("/equipo/" + person.slug, siteConfig.url).toString(), ...(person.profile_image_url ? { image: new URL(person.profile_image_url, siteConfig.url).toString() } : {}) }} />
  </div>;
}
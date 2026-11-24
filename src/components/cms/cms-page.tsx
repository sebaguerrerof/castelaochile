import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, LockKeyhole } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactActions } from "@/components/shared/contact-actions";
import { EditorialParagraphs } from "@/components/shared/editorial-paragraphs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SafeHtml } from "@/components/content/safe-html";
import { textVariants } from "@/lib/cms/presentation";
import { CmsCta } from "@/components/cms/cms-cta";
import { JsonLd } from "@/components/cms/json-ld";
import { CardList } from "@/components/cms/blocks/card-list";
import { Hero } from "@/components/cms/blocks/hero";
import { WarningBlock } from "@/components/cms/blocks/warning-block";
import { ContactForm } from "@/components/contact/contact-form";
import { isContactIntakeEnabled, runtimeConfig } from "@/lib/runtime-config";
import { getContactActions } from "@/lib/contact-links";
import { getCmsPage, getSiteSettings, listProfessionals, settingsContact } from "@/lib/cms/repository";
import { createPageMetadata } from "@/lib/page-metadata";
import { siteConfig } from "@/config/site";
import { formatContactNumber } from "@/lib/format-contact-number";
import type { BlockData, CmsBlock, SiteSettings } from "@/lib/cms/schemas";
import type { CmsPage } from "@/lib/cms/repository";
import type { ProfessionalRow } from "@/types/cms";

export { JsonLd } from "@/components/cms/json-ld";

export function ProfessionalIdentity({ person, className = "" }: { person: ProfessionalRow; className?: string }) {
  const initials = person.full_name.replace(/^(dra?|lic)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return <div className={"professional-identity " + className}>
    {person.profile_image_url ? <Image alt={person.profile_image_alt} className="professional-identity__image" fill sizes="(max-width: 767px) 100vw, 35vw" src={person.profile_image_url} unoptimized /> : <div aria-hidden="true" className="professional-identity__initials"><span>{initials}</span><span className="professional-identity__line" /></div>}
  </div>;
}

export function TeamGrid({ professionals, preview = false, headingLevel = 3 }: { professionals: ProfessionalRow[]; preview?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <div className="cms-team-grid" data-count={professionals.length}>{professionals.map((person) => <article className="cms-team-card" key={person.id}>
    <ProfessionalIdentity person={person} />
    <div className="cms-team-card__body"><p className="eyebrow">{person.role}</p><Heading>{person.full_name}</Heading>
      {person.credentials.length > 0 && <ul className="cms-team-card__credentials">{person.credentials.map((credential) => <li key={credential}>{credential}</li>)}</ul>}
      {person.short_bio && <p className="cms-team-card__bio">{person.short_bio}</p>}
      <Link className="public-text-link" href={preview ? `/admin/vista-previa/equipo/${person.id}` : "/equipo/" + person.slug}>Conocer perfil<ArrowUpRight size={18} /></Link>
    </div>
  </article>)}</div>;
}

type RenderContext = { settings: SiteSettings; professionals: ProfessionalRow[]; preview: boolean };
function BlockContent({ block, context }: { block: CmsBlock; context: RenderContext }) {
  const { settings, professionals } = context;
  switch (block.section_type) {
    case "hero": return null;
    case "rich_text": return <div className="cms-prose"><SafeHtml value={block.data.html} /></div>;
    case "text_image": return <div className="cms-text-image"><div className="cms-prose"><SafeHtml value={block.data.html} /></div><figure><Image alt={block.data.image.alt} height={900} sizes="(max-width: 767px) 100vw, 45vw" src={block.data.image.src} unoptimized={block.data.image.src.startsWith("/api/")} width={800} /><figcaption>{block.data.image.alt}</figcaption></figure></div>;
    case "feature_cards": case "principles": case "steps": return <CardList block={block} />;
    case "stats": return <dl className="cms-stats" data-count={block.data.items.length}>{block.data.items.map((item, index) => <div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
    case "pricing": return <div className="cms-pricing" data-count={block.data.items.length}>{block.data.items.map((item, index) => <article className="cms-price-card" key={index}><div><p className="eyebrow">{item.title}</p><h3><span>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(item.price)}</span> <span className="cms-price-card__currency">CLP</span></h3>{item.unit && <p className="cms-price-card__unit">{item.unit}</p>}</div>{item.note && <p className="cms-price-card__note"><Check aria-hidden="true" size={18} />{item.note}</p>}</article>)}</div>;
    case "cta": return <div className="cms-cta__actions"><CmsCta cta={block.data.primaryCta} inverted settings={settings} />{block.data.secondaryCta && <CmsCta cta={block.data.secondaryCta} inverted secondary settings={settings} />}</div>;
    case "warning": return null;
    case "faq": return <div className="cms-faq"><Accordion collapsible type="single">{block.data.items.filter((item) => item.is_enabled).map((item, index) => <AccordionItem key={index} value={"faq-" + index}><AccordionTrigger>{item.question}</AccordionTrigger><AccordionContent>{item.answer}</AccordionContent></AccordionItem>)}</Accordion><JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: block.data.items.filter((item) => item.is_enabled).map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} /></div>;
    case "team_preview": return <><TeamGrid headingLevel={block.data.showTitle ? 3 : 2} preview={context.preview} professionals={professionals.filter((person) => !block.data.featuredOnly || person.is_featured)} />{block.data.featuredOnly && <Link className="public-text-link cms-team-link" href="/equipo">Conoce a nuestro equipo<ArrowRight size={18} /></Link>}</>;
    case "gallery": return <div className="cms-gallery">{block.data.images.map((image, index) => <figure key={index}><Image alt={image.alt} height={600} sizes="(max-width: 767px) 100vw, 33vw" src={image.src} unoptimized={image.src.startsWith("/api/")} width={800} /><figcaption>{image.alt}</figcaption></figure>)}</div>;
    case "contact": {
      const enabled = isContactIntakeEnabled();
      return <div className="cms-contact"><div className="cms-contact__channels"><ContactActions actions={getContactActions(settingsContact(settings))} />{settings.whatsapp && <p className="cms-contact__number">WhatsApp: {formatContactNumber(settings.whatsapp)}</p>}{settings.streetAddress && <p>{settings.streetAddress}</p>}{settings.email && <a className="public-text-link" href={"mailto:" + settings.email}>{settings.email}<ArrowUpRight size={16} /></a>}</div>
        {enabled ? <ContactForm consentLabel={runtimeConfig.contactPrivacyConsentLabel ?? null} enabled privacyPolicyUrl={runtimeConfig.contactPrivacyPolicyUrl ?? null} /> : <aside className="cms-contact__privacy"><LockKeyhole aria-hidden="true" size={26} /><h3>Tu privacidad importa</h3><p>Al contactarnos, comparte solo información general. Los antecedentes de salud se conversan durante una evaluación profesional.</p></aside>}
      </div>;
    }
  }
}

// Exhaustive typed registry: CMS edits use the same rendering in public and private preview.
export const sectionRegistry = Object.freeze(["hero", "rich_text", "text_image", "feature_cards", "principles", "steps", "stats", "pricing", "cta", "warning", "faq", "team_preview", "gallery", "contact"] as const);
export async function CmsPageView({ page, preview = false, previewLinks = {} }: { page: CmsPage; preview?: boolean; previewLinks?: Record<string, string> }) {
  const [originalSettings, allProfessionals] = await Promise.all([getSiteSettings(preview), listProfessionals(preview)]);
  const settings = { ...originalSettings, evaluationUrl: previewLinks[originalSettings.evaluationUrl] ?? originalSettings.evaluationUrl };
  const professionals = preview ? allProfessionals.filter(person => person.status !== "archived" && (person.status === "published" || person.draft_updated_at)) : allProfessionals;
  const context = { settings, professionals, preview };
  const sections = preview ? mapPreviewLinks(page.sections, previewLinks) as CmsBlock[] : page.sections;
  const variants = textVariants(sections);
  return <div className="cms-page" data-page={page.slug}>{sections.map((block) => {
    if (block.section_type === "hero") return <Hero data={block.data} key={block.id} page={page} settings={settings} />;
    if (block.section_type === "warning") return <WarningBlock data={block.data} key={block.id} />;
    if (block.section_type === "cta") return <Section className={"cms-cta" + (block.data.showTitle ? "" : " cms-section--untitled")} key={block.id}><div className="cms-cta__inner"><SectionHeading className="cms-section-heading" description={block.data.description} inverted showTitle={block.data.showTitle} subtitle={block.data.subtitle} title={block.data.title} /><BlockContent block={block} context={context} /></div></Section>;
    const editorial = ["rich_text", "pricing", "faq", "contact"].includes(block.section_type);
    return <Section className={"cms-section cms-section--" + block.section_type + (block.data.showTitle ? "" : " cms-section--untitled")} data-variant={variants.get(block.id)} key={block.id}><div className={editorial ? "cms-editorial" : undefined}><SectionHeading className="cms-section-heading" description={block.data.description} showTitle={block.data.showTitle} subtitle={block.data.subtitle} title={block.data.title} /><div className="cms-section-content"><BlockContent block={block} context={context} /></div></div></Section>;
  })}</div>;
}
export async function CmsRoute({ slug, requestedPath }: { slug: string; requestedPath?: string }) {
  const page = await getCmsPage(slug);
  if (!page) notFound();
  if (requestedPath && page.path !== requestedPath) permanentRedirect(page.path);
  return <CmsPageView page={page} />;
}
export async function cmsMetadata(slug: string): Promise<Metadata> {
  const page = await getCmsPage(slug);
  return cmsPageMetadata(page);
}
export function cmsPageMetadata(page: CmsPage | null): Metadata {
  if (!page) return { title: "Página no disponible", robots: { index: false, follow: false } };
  const hero = page.sections.find((block) => block.section_type === "hero");
  const title = page.seo_title || page.title;
  const description = page.seo_description || hero?.data.description || siteConfig.description;
  const metadata = createPageMetadata({ title, description, path: page.path });
  return { ...metadata, openGraph: { ...metadata.openGraph, ...(page.og_image_url ? { images: [page.og_image_url] } : {}) } };
}

function mapPreviewLinks(value: unknown, links: Record<string, string>): unknown {
  if (Array.isArray(value)) return value.map(item => mapPreviewLinks(item, links));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === "href" && typeof item === "string" ? links[item] ?? item : mapPreviewLinks(item, links)]));
  return value;
}

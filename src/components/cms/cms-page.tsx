import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, LockKeyhole, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactActions } from "@/components/shared/contact-actions";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SafeHtml } from "@/components/content/safe-html";
import { ContactForm } from "@/components/contact/contact-form";
import { isContactIntakeEnabled, runtimeConfig } from "@/lib/runtime-config";
import { getContactActions, whatsappHref } from "@/lib/contact-links";
import { getCmsPage, getSiteSettings, listProfessionals, settingsContact } from "@/lib/cms/repository";
import { createPageMetadata } from "@/lib/page-metadata";
import { siteConfig } from "@/config/site";
import type { BlockData, CmsBlock, SiteSettings } from "@/lib/cms/schemas";
import type { CmsPage } from "@/lib/cms/repository";
import type { ProfessionalRow } from "@/types/cms";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function CmsCta({ cta, settings, inverted = false, secondary = false }: { cta: BlockData<"cta">["primaryCta"]; settings: SiteSettings; inverted?: boolean; secondary?: boolean }) {
  const href = cta.target === "whatsapp" ? whatsappHref(settings.whatsapp) : cta.target === "evaluation" ? settings.evaluationUrl : cta.href;
  if (!href) return null;
  const classes = buttonVariants({ variant: inverted ? secondary ? "invertedOutline" : "inverted" : secondary || cta.target === "whatsapp" ? "outline" : "primary", className: "public-button" });
  const content = <>{cta.target === "evaluation" ? settings.evaluationLabel : cta.label}{cta.target === "whatsapp" ? <WhatsAppIcon className="public-button__icon" /> : <ArrowRight size={18} />}</>;
  return href.startsWith("/") ? <Link className={classes} href={href}>{content}</Link> : <a className={classes} href={href} rel="noopener noreferrer" target="_blank">{content}</a>;
}

function Hero({ data, settings, page }: { data: BlockData<"hero">; settings: SiteSettings; page: CmsPage }) {
  const home = page.path === "/";
  const inverted = data.variant !== "mist";
  return <section className={"cms-hero cms-hero--" + data.variant + (home ? " cms-hero--home" : "") + (!data.image ? " cms-hero--text" : "")}>
    {data.image && <div className="cms-hero__media"><Image alt={data.image.alt} className="cms-hero__image" fill preload sizes={home ? "100vw" : "(max-width: 767px) 100vw, 48vw"} src={data.image.src} unoptimized={data.image.src.startsWith("/api/")} /></div>}
    <Container className="cms-hero__container">
      {!home && <Breadcrumbs current={page.title} />}
      <div className="cms-hero__copy">
        {data.eyebrow && <p className="eyebrow cms-hero__eyebrow"><span />{data.eyebrow}</p>}
        <h1>{data.title}</h1>
        {data.description && <p className="cms-hero__description">{data.description}</p>}
        <div className="cms-hero__actions">{data.primaryCta && <CmsCta cta={data.primaryCta} inverted={inverted} settings={settings} />}{data.secondaryCta && <CmsCta cta={data.secondaryCta} inverted={inverted} secondary settings={settings} />}</div>
      </div>
    </Container>
  </section>;
}

export function ProfessionalIdentity({ person, className = "" }: { person: ProfessionalRow; className?: string }) {
  const initials = person.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return <div className={"professional-identity " + className}>
    {person.profile_image_url ? <Image alt={person.profile_image_alt} className="professional-identity__image" fill sizes="(max-width: 767px) 100vw, 35vw" src={person.profile_image_url} unoptimized /> : <div aria-hidden="true" className="professional-identity__initials"><span>{initials}</span><span className="professional-identity__line" /></div>}
  </div>;
}

export function TeamGrid({ professionals }: { professionals: ProfessionalRow[] }) {
  return <div className="cms-team-grid" data-count={professionals.length}>{professionals.map((person) => <article className="cms-team-card" key={person.id}>
    <ProfessionalIdentity person={person} />
    <div className="cms-team-card__body"><p className="eyebrow">{person.role}</p><h3>{person.full_name}</h3>
      {person.credentials.length > 0 && <ul className="cms-team-card__credentials">{person.credentials.map((credential) => <li key={credential}>{credential}</li>)}</ul>}
      {person.short_bio && <p className="cms-team-card__bio">{person.short_bio}</p>}
      <Link className="public-text-link" href={"/equipo/" + person.slug}>Conocer perfil<ArrowUpRight size={18} /></Link>
    </div>
  </article>)}</div>;
}

type RenderContext = { settings: SiteSettings; professionals: ProfessionalRow[] };
function BlockContent({ block, context }: { block: CmsBlock; context: RenderContext }) {
  const { settings, professionals } = context;
  switch (block.section_type) {
    case "hero": return null;
    case "rich_text": return <div className="cms-prose"><SafeHtml value={block.data.html} /></div>;
    case "text_image": return <div className="cms-text-image"><div className="cms-prose"><SafeHtml value={block.data.html} /></div><figure><Image alt={block.data.image.alt} height={900} sizes="(max-width: 767px) 100vw, 45vw" src={block.data.image.src} unoptimized={block.data.image.src.startsWith("/api/")} width={800} /><figcaption>{block.data.image.alt}</figcaption></figure></div>;
    case "feature_cards": case "principles": case "steps": return <div className={"cms-card-grid cms-card-grid--" + block.section_type} data-count={block.data.items.length}>{block.data.items.map((item, index) => {
      const contents = <><span aria-hidden="true" className="cms-card__index">{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}{item.href && <ArrowUpRight aria-hidden="true" className="cms-card__arrow" size={20} />}</>;
      return item.href ? <Link className="cms-card cms-card--link" href={item.href} key={index}>{contents}</Link> : <article className="cms-card" key={index}>{contents}</article>;
    })}</div>;
    case "stats": return <dl className="cms-stats" data-count={block.data.items.length}>{block.data.items.map((item, index) => <div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
    case "pricing": return <div className="cms-pricing" data-count={block.data.items.length}>{block.data.items.map((item, index) => <article className="cms-price-card" key={index}><div><p className="eyebrow">{item.title}</p><h3><span>{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(item.price)}</span> <span className="cms-price-card__currency">CLP</span></h3>{item.unit && <p className="cms-price-card__unit">{item.unit}</p>}</div>{item.note && <p className="cms-price-card__note"><Check aria-hidden="true" size={18} />{item.note}</p>}</article>)}</div>;
    case "cta": return <div className="cms-cta__actions"><CmsCta cta={block.data.primaryCta} inverted settings={settings} />{block.data.secondaryCta && <CmsCta cta={block.data.secondaryCta} inverted secondary settings={settings} />}</div>;
    case "warning": return null;
    case "faq": return <div className="cms-faq"><Accordion collapsible type="single">{block.data.items.filter((item) => item.is_enabled).map((item, index) => <AccordionItem key={index} value={"faq-" + index}><AccordionTrigger>{item.question}</AccordionTrigger><AccordionContent>{item.answer}</AccordionContent></AccordionItem>)}</Accordion><JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: block.data.items.filter((item) => item.is_enabled).map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }} /></div>;
    case "team_preview": return <><TeamGrid professionals={professionals.filter((person) => !block.data.featuredOnly || person.is_featured)} />{block.data.featuredOnly && <Link className="public-text-link cms-team-link" href="/equipo">Conoce a nuestro equipo<ArrowRight size={18} /></Link>}</>;
    case "gallery": return <div className="cms-gallery">{block.data.images.map((image, index) => <figure key={index}><Image alt={image.alt} height={600} sizes="(max-width: 767px) 100vw, 33vw" src={image.src} unoptimized={image.src.startsWith("/api/")} width={800} /><figcaption>{image.alt}</figcaption></figure>)}</div>;
    case "contact": {
      const enabled = isContactIntakeEnabled();
      return <div className="cms-contact"><div className="cms-contact__channels"><ContactActions actions={getContactActions(settingsContact(settings))} />{settings.streetAddress && <p>{settings.streetAddress}</p>}{settings.email && <a className="public-text-link" href={"mailto:" + settings.email}>{settings.email}<ArrowUpRight size={16} /></a>}</div>
        {enabled ? <ContactForm consentLabel={runtimeConfig.contactPrivacyConsentLabel ?? null} enabled privacyPolicyUrl={runtimeConfig.contactPrivacyPolicyUrl ?? null} /> : <aside className="cms-contact__privacy"><LockKeyhole aria-hidden="true" size={26} /><h3>Tu privacidad importa</h3><p>Al contactarnos, comparte solo información general. Los antecedentes de salud se conversan durante una evaluación profesional.</p></aside>}
      </div>;
    }
  }
}

// Exhaustive typed registry: CMS edits use the same rendering in public and private preview.
export const sectionRegistry = Object.freeze(["hero", "rich_text", "text_image", "feature_cards", "principles", "steps", "stats", "pricing", "cta", "warning", "faq", "team_preview", "gallery", "contact"] as const);
export async function CmsPageView({ page }: { page: CmsPage }) {
  const [settings, professionals] = await Promise.all([getSiteSettings(), listProfessionals()]);
  const context = { settings, professionals };
  return <div className="cms-page" data-page={page.slug}>{page.sections.map((block) => {
    if (block.section_type === "hero") return <Hero data={block.data} key={block.id} page={page} settings={settings} />;
    if (block.section_type === "warning") return <Section className="cms-warning" key={block.id}><div className="cms-warning__inner"><ShieldAlert aria-hidden="true" size={26} /><div><h2>{block.data.title}</h2>{block.data.description && <p>{block.data.description}</p>}</div></div></Section>;
    if (block.section_type === "cta") return <Section className="cms-cta" key={block.id}><div className="cms-cta__inner"><SectionHeading className="cms-section-heading" description={block.data.description} inverted title={block.data.title} /><BlockContent block={block} context={context} /></div></Section>;
    const editorial = ["rich_text", "pricing", "faq", "contact"].includes(block.section_type);
    return <Section className={"cms-section cms-section--" + block.section_type} key={block.id}><div className={editorial ? "cms-editorial" : undefined}><SectionHeading className="cms-section-heading" description={block.data.description} title={block.data.title} /><div className="cms-section-content"><BlockContent block={block} context={context} /></div></div></Section>;
  })}</div>;
}
export async function CmsRoute({ slug }: { slug: string }) {
  const page = await getCmsPage(slug);
  if (!page) notFound();
  return <CmsPageView page={page} />;
}
export async function cmsMetadata(slug: string): Promise<Metadata> {
  const page = await getCmsPage(slug);
  if (!page) return { title: "Página no disponible", robots: { index: false, follow: false } };
  const hero = page.sections.find((block) => block.section_type === "hero");
  const title = page.seo_title || page.title;
  const description = page.seo_description || hero?.data.description || siteConfig.description;
  const metadata = createPageMetadata({ title, description, path: page.path });
  return { ...metadata, openGraph: { ...metadata.openGraph, ...(page.og_image_url ? { images: [page.og_image_url] } : {}) } };
}

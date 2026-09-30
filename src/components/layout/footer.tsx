import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { contactConfig } from "@/config/contact";
import { navigationItems } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { homeContent } from "@/content/home";
import { whatsappHref } from "@/lib/contact-links";
import { groupPublicNavigation } from "@/lib/public-navigation";
import type { ContactConfig, NavigationItem } from "@/types/site";
import { BrandLogo } from "@/components/shared/brand-logo";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Container } from "./container";

export function Footer({ items = navigationItems, contact = contactConfig, notice = homeContent.footerNotice }: { items?: readonly NavigationItem[]; contact?: ContactConfig; notice?: string }) {
  const groups = groupPublicNavigation(items);
  const whatsapp = whatsappHref(contact.whatsapp);
  const institutional = groups.filter((group) => group.id === "instituto" || group.id === "recursos").flatMap((group) => group.items);
  const treatment = groups.filter((group) => group.id === "tratamiento" || group.id === "familias").flatMap((group) => group.items);
  return <footer className="public-footer"><Container>
    <div className="public-footer__grid">
      <div className="public-footer__about"><Link aria-label="Instituto Castelao Chile, ir al inicio" href="/"><BrandLogo placement="footer" /></Link><p>{notice}</p><span className="public-footer__signature">Instituto Castelao · Chile</span></div>
      <nav aria-label="Instituto e información"><h2>Conócenos</h2><ul>{institutional.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul></nav>
      <nav aria-label="Tratamientos y familias"><h2>Acompañamiento</h2><ul>{treatment.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul></nav>
      <div className="public-footer__contact"><h2>Conversemos</h2>{whatsapp && <a className="public-footer__channel" href={whatsapp} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /><span>WhatsApp</span><ArrowUpRight size={17} /></a>}{contact.phone && <a href={"tel:" + contact.phone}><Phone size={16} />{contact.phone}</a>}{contact.email && <a href={"mailto:" + contact.email}><Mail size={16} />{contact.email}</a>}{contact.streetAddress && <p><MapPin size={17} />{contact.streetAddress}</p>}{items.some((item) => item.href === "/contacto") && <Link className="public-footer__contact-link" href="/contacto">Ir a contacto<ArrowUpRight size={17} /></Link>}</div>
    </div>
    <div className="public-footer__bottom"><p>© {new Date().getFullYear()} {siteConfig.name}.</p><span>Información institucional</span><a href="#main-content">Volver arriba ↑</a></div>
  </Container></footer>;
}
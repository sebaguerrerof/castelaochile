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
import type { SiteSettings } from "@/lib/cms/schemas";
import { formatContactNumber } from "@/lib/format-contact-number";

export function Footer({ items = navigationItems, contact = contactConfig, notice = homeContent.footerNotice, settings }: { items?: readonly NavigationItem[]; contact?: ContactConfig; notice?: string; settings?: SiteSettings }) {
  const groups = groupPublicNavigation(items, settings?.navigationGroups);
  const whatsapp = whatsappHref(contact.whatsapp);
  const columns = [groups.filter((_, index) => index % 2 === 0), groups.filter((_, index) => index % 2 === 1)];
  return <footer className="public-footer"><Container>
    <div className="public-footer__grid">
      <div className="public-footer__about"><Link aria-label="Instituto Castelao Chile, ir al inicio" href="/"><BrandLogo placement="footer" /></Link><p>{settings?.footerDescription || notice}</p><span className="public-footer__signature">{settings?.footerTagline || "Instituto Castelao · Chile"}</span></div>
      {columns.map((column, index) => <div key={index}>{column.map(group => <nav aria-label={group.label} key={group.id}><h2>{group.label}</h2><ul>{group.items.map(item => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul></nav>)}</div>)}
      <div className="public-footer__contact"><h2>Conversemos</h2>{whatsapp && <a className="public-footer__channel" href={whatsapp} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /><span>WhatsApp · {formatContactNumber(contact.whatsapp!)}</span><ArrowUpRight size={17} /></a>}{contact.phone && <a href={"tel:" + contact.phone}><Phone size={16} />{contact.phone}</a>}{contact.email && <a href={"mailto:" + contact.email}><Mail size={16} />{contact.email}</a>}{contact.streetAddress && <p><MapPin size={17} />{contact.streetAddress}</p>}{items.some((item) => item.href === "/contacto") && <Link className="public-footer__contact-link" href="/contacto">Ir a contacto<ArrowUpRight size={17} /></Link>}</div>
    </div>
    {settings?.footerDescription && <p>{notice}</p>}
    <div className="public-footer__bottom"><p>© {new Date().getFullYear()} {siteConfig.name}.</p>{settings?.privacyUrl && <Link href={settings.privacyUrl}>{settings.privacyLabel}</Link>}{Object.entries(contact.socialLinks).filter(([, href]) => href).map(([label, href]) => <a href={href!} key={label} rel="noopener noreferrer" target="_blank">{label}</a>)}<a href="#main-content">Volver arriba ↑</a></div>
  </Container></footer>;
}

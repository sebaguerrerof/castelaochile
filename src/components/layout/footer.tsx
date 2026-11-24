import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
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

type FooterProps = { items?: readonly NavigationItem[]; contact?: ContactConfig; notice?: string; settings?: SiteSettings };

/** Minimal footer on the corporate blue: logo, contact, one row of links and the legal line. */
export function Footer({ items = navigationItems, contact = contactConfig, notice = homeContent.footerNotice, settings }: FooterProps) {
  const groups = groupPublicNavigation(items, settings?.navigationGroups);
  const whatsapp = whatsappHref(contact.whatsapp);
  return <footer className="public-footer">
    <Container className="public-footer__inner">
      <div className="public-footer__top">
        <Link aria-label="Instituto Castelao Chile, ir al inicio" href="/"><BrandLogo placement="footer" variant="verticalNegative" /></Link>
        <div className="public-footer__contact">
          {whatsapp && <a className="public-footer__channel" href={whatsapp} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /><span>{formatContactNumber(contact.whatsapp!)}</span><ArrowUpRight aria-hidden="true" size={17} /></a>}
          {contact.email && <a className="public-footer__mail" href={"mailto:" + contact.email}><Mail aria-hidden="true" size={16} />{contact.email}</a>}
        </div>
      </div>
      <nav aria-label="Pie de página" className="public-footer__nav"><ul>{groups.map(group => <li key={group.id}><Link href={group.items[0].href}>{group.label}</Link></li>)}</ul></nav>
    </Container>
    <div className="public-footer__bottom"><Container className="public-footer__bottom-inner">
      <p>© {new Date().getFullYear()} {siteConfig.name}.</p>
      <p className="public-footer__notice">{notice}</p>
      {settings?.privacyUrl && <Link href={settings.privacyUrl}>{settings.privacyLabel}</Link>}
    </Container></div>
  </footer>;
}

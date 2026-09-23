import { contactConfig } from "@/config/contact";
import { navigationItems } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getContactActions, whatsappHref } from "@/lib/contact-links";
import { homeContent } from "@/content/home";
import { cn } from "@/lib/utils";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ContactActions } from "@/components/shared/contact-actions";
import { Container } from "./container";

export function Footer() {
  const contactActions = getContactActions(contactConfig);

  return (
    <footer
      className={cn(
        "border-t border-primary/20 bg-primary py-12 text-primary-foreground",
        whatsappHref(contactConfig.whatsapp) && "pb-28",
      )}
    >
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <BrandLogo placement="footer" />
            <p className="mt-5 max-w-xl text-sm leading-6 text-primary-foreground/80">
              {homeContent.footerNotice}
            </p>
          </div>
          <nav aria-label="Navegación del pie de página">
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-3">
              {navigationItems.map((item) => (
                <li key={item.href}>
                  <a
                    className="font-nav text-xs font-bold uppercase tracking-[0.08em] text-primary-foreground/85 transition-colors hover:text-primary-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {contactActions.length > 0 ? (
            <div className="md:col-span-2">
              <ContactActions actions={contactActions} variant="inverted" />
            </div>
          ) : null}
        </div>
        <div className="mt-10 border-t border-primary-foreground/20 pt-5 font-nav text-xs text-primary-foreground/65">
          © {new Date().getFullYear()} {siteConfig.name}. Información institucional.
        </div>
      </Container>
    </footer>
  );
}

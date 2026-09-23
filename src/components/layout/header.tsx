"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { contactConfig } from "@/config/contact";
import { navigationItems } from "@/config/navigation";
import { getContactActions } from "@/lib/contact-links";

import { BrandLogo } from "@/components/shared/brand-logo";
import { ContactActionLink } from "@/components/shared/contact-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container } from "./container";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const pathname = usePathname();
  const primaryContactAction = getContactActions(contactConfig)[0];

  useEffect(() => {
    const updateHeader = () => setIsCompact(window.scrollY > 18);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  return (
    <header className={cn("site-header sticky top-0 z-50", isCompact && "site-header--compact")}>
      <Container className="site-header__inner flex items-center justify-between gap-6 py-3">
        <Link
          aria-label="Instituto Castelao Chile, ir al inicio"
          href="/"
          onClick={() => setIsOpen(false)}
        >
          <BrandLogo priority />
        </Link>

        <nav aria-label="Navegación principal" className="hidden xl:block">
          <ul className="flex items-center gap-5">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "font-nav text-xs font-bold uppercase tracking-[0.07em] transition-colors hover:text-primary",
                    pathname === item.href ? "text-primary" : "text-foreground",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {primaryContactAction ? (
          <ContactActionLink
            action={primaryContactAction}
            className="hidden xl:inline-flex"
            variant="accent"
          />
        ) : null}

        <Button
          aria-controls="mobile-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          className="size-11 rounded-full p-0 xl:hidden"
          onClick={() => setIsOpen((current) => !current)}
          variant="outline"
        >
          {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </Button>
      </Container>

      {isOpen ? (
        <div className="mobile-navigation-panel xl:hidden" id="mobile-navigation">
          <Container>
            <nav aria-label="Navegación móvil" className="py-4">
              <ul className="grid gap-1">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-4 py-3 font-nav text-sm font-bold hover:bg-secondary hover:text-primary",
                        pathname === item.href ? "bg-secondary text-primary" : "text-foreground",
                      )}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

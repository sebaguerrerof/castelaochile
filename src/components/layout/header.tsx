"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { navigationItems } from "@/config/navigation";

import { BrandLogo } from "@/components/shared/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container } from "./container";

export function Header() {
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const pathname = usePathname();
  const isMenuMounted = menuRoute === pathname;
  const isOpen = isMenuMounted && !isMenuClosing;

  const openMenu = useCallback(() => {
    setIsMenuClosing(false);
    setMenuRoute(pathname);
  }, [pathname]);

  const closeMenu = useCallback((restoreFocus = false) => {
    if (!isMenuMounted) return;

    setIsMenuClosing(true);

    if (restoreFocus) {
      window.requestAnimationFrame(() => document.getElementById("mobile-menu-toggle")?.focus());
    }
  }, [isMenuMounted]);

  useEffect(() => {
    const updateHeader = () => setIsCompact(window.scrollY > 18);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);


  const handleMobileAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (!isMenuClosing || event.target !== event.currentTarget) return;

    setMenuRoute(null);
    setIsMenuClosing(false);
  };

  const closeMobileFromLink = () => closeMenu();

  return (
    <header className={cn("site-header sticky top-0 z-50", isCompact && "site-header--compact")}>
      <Container className="site-header__inner flex items-center justify-between gap-6 py-3">
        <Link
          aria-label="Instituto Castelao Chile, ir al inicio"
          href="/"
          onClick={closeMobileFromLink}
        >
          <BrandLogo priority />
        </Link>

        <nav aria-label="Navegación principal" className="hidden xl:block">
          <ul className="flex items-center gap-5">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={cn("site-nav-link", isActive && "site-nav-link--active")}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Button
          aria-controls="mobile-navigation"
          id="mobile-menu-toggle"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          className="size-11 rounded-full p-0 xl:hidden"
          onClick={() => (isOpen ? closeMenu(true) : openMenu())}
          variant="outline"
        >
          {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </Button>
      </Container>

      {isMenuMounted ? (
        <div
          aria-hidden={isMenuClosing || undefined}
          className={cn("mobile-navigation-panel xl:hidden", isMenuClosing && "mobile-navigation-panel--closing")}
          id="mobile-navigation"
          onAnimationEnd={handleMobileAnimationEnd}
        >
          <Container>
            <nav aria-label="Navegación móvil" className="py-4">
              <ul className="grid gap-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={cn("mobile-navigation-link", isActive && "mobile-navigation-link--active")}
                        href={item.href}
                        onClick={closeMobileFromLink}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}

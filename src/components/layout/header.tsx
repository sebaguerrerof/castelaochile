"use client";

import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { navigationItems } from "@/config/navigation";
import { groupPublicNavigation, isPublicLinkActive } from "@/lib/public-navigation";
import { whatsappHref } from "@/lib/contact-links";
import type { NavigationItem } from "@/types/site";
import { BrandLogo } from "@/components/shared/brand-logo";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Container } from "./container";

export function Header({ items = navigationItems, evaluationUrl = "/contacto", evaluationLabel = "Agendar evaluación", whatsapp = "" }: { items?: readonly NavigationItem[]; evaluationUrl?: string; evaluationLabel?: string; whatsapp?: string }) {
  const pathname = usePathname();
  const groups = groupPublicNavigation(items);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLElement>(null);
  const hoverClose = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whatsappUrl = whatsappHref(whatsapp);

  const cancelHoverClose = useCallback(() => {
    if (hoverClose.current !== null) clearTimeout(hoverClose.current);
    hoverClose.current = null;
  }, []);
  const closeDropdown = useCallback(() => { cancelHoverClose(); setDropdown(null); }, [cancelHoverClose]);
  function enterGroup(event: React.PointerEvent<HTMLLIElement>, id: string | null) {
    if (event.pointerType !== "mouse") return;
    cancelHoverClose();
    setDropdown(id);
  }
  function leaveGroup(event: React.PointerEvent<HTMLLIElement>, id: string) {
    if (event.pointerType !== "mouse") return;
    cancelHoverClose();
    // A brief grace period lets the pointer reach the panel without flicker.
    hoverClose.current = setTimeout(() => {
      setDropdown((current) => current === id ? null : current);
      hoverClose.current = null;
    }, 140);
  }
  function closeMobile() { dialog.current?.close(); }
  function openMobile() { dialog.current?.showModal(); setMobileOpen(true); }
  function cycleMobileFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) closeDropdown();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !dropdown) return;
      header.current?.querySelector<HTMLButtonElement>('[data-navigation-trigger="' + dropdown + '"]')?.focus();
      closeDropdown();
    }
    const breakpoint = window.matchMedia("(min-width: 1180px)");
    function resize() { if (breakpoint.matches) dialog.current?.close(); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    breakpoint.addEventListener("change", resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); breakpoint.removeEventListener("change", resize); };
  }, [dropdown, closeDropdown]);

  useEffect(() => () => { if (hoverClose.current !== null) clearTimeout(hoverClose.current); }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  return <header className="public-header" ref={header}>
    <div className="public-header__utility"><Container>
      <span>Instituto Castelao <span className="public-header__country">Chile</span></span>
      {whatsappUrl && <a href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /> <span>Conversemos por WhatsApp</span><ArrowRight size={14} /></a>}
    </Container></div>
    <Container className="public-header__main">
      <Link aria-label="Instituto Castelao Chile, ir al inicio" className="public-header__brand" href="/" onClick={() => setDropdown(null)}><BrandLogo priority /></Link>
      <nav aria-label="Navegación principal" className="public-header__navigation">
        <ul>{groups.map((group) => {
          const active = group.items.some((item) => isPublicLinkActive(pathname, item.href));
          return <li className="public-nav-group" key={group.id} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeDropdown(); }} onPointerEnter={(event) => enterGroup(event, group.items.length > 1 ? group.id : null)} onPointerLeave={(event) => leaveGroup(event, group.id)}>
            {group.items.length === 1 ? <Link aria-current={active ? "page" : undefined} className="public-nav-link" href={group.items[0].href} onClick={() => setDropdown(null)}>{group.label}</Link> : <>
              <button aria-controls={"navigation-" + group.id} aria-expanded={dropdown === group.id} className="public-nav-link" data-active={active || undefined} data-navigation-trigger={group.id} onClick={(event) => { cancelHoverClose(); setDropdown(event.detail === 0 && dropdown === group.id ? null : group.id); }} type="button">{group.label}<ChevronDown size={14} /></button>
              <ul aria-hidden={dropdown !== group.id} className="public-nav-dropdown" data-open={dropdown === group.id} inert={dropdown !== group.id} id={"navigation-" + group.id}>{group.items.map((item) => <li key={item.href}><Link aria-current={isPublicLinkActive(pathname, item.href) ? "page" : undefined} href={item.href} onClick={closeDropdown}><span>{item.label}</span><ArrowRight size={15} /></Link></li>)}</ul>
            </>}
          </li>;
        })}</ul>
      </nav>
      <Link className="public-button public-button--primary public-header__cta" href={evaluationUrl}>{evaluationLabel}<ArrowRight size={16} /></Link>
      <button aria-controls="mobile-navigation" aria-expanded={mobileOpen} aria-label="Abrir menú" className="public-header__toggle" id="mobile-menu-toggle" onClick={openMobile} type="button"><Menu size={24} /><span>Menú</span></button>
    </Container>
    <dialog aria-label="Menú principal" className="public-mobile-menu" id="mobile-navigation" onClick={(event) => { if (event.target === event.currentTarget) closeMobile(); }} onClose={() => setMobileOpen(false)} onKeyDown={cycleMobileFocus} ref={dialog}>
      <div className="public-mobile-menu__inner">
        <div className="public-mobile-menu__header"><BrandLogo /><button aria-label="Cerrar menú" className="public-header__toggle" onClick={closeMobile} type="button"><X size={24} /></button></div>
        <nav aria-label="Navegación móvil"><Link className="public-mobile-link" href="/" onClick={closeMobile}>Inicio<ArrowRight size={16} /></Link>{groups.map((group) => group.items.length === 1 ? <Link aria-current={isPublicLinkActive(pathname, group.items[0].href) ? "page" : undefined} className="public-mobile-link" href={group.items[0].href} key={group.id} onClick={closeMobile}>{group.label}<ArrowRight size={16} /></Link> : <details className="public-mobile-group" key={group.id} open={group.items.some((item) => isPublicLinkActive(pathname, item.href))}><summary>{group.label}<ChevronDown size={18} /></summary><div>{group.items.map((item) => <Link aria-current={isPublicLinkActive(pathname, item.href) ? "page" : undefined} href={item.href} key={item.href} onClick={closeMobile}>{item.label}<ArrowRight size={15} /></Link>)}</div></details>)}</nav>
        <div className="public-mobile-menu__contact"><Link className="public-button public-button--primary" href={evaluationUrl} onClick={closeMobile}>{evaluationLabel}<ArrowRight size={16} /></Link>{whatsappUrl && <a className="public-mobile-menu__whatsapp" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /> WhatsApp</a>}</div>
      </div>
    </dialog>
  </header>;
}

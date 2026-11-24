"use client";

import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { navigationItems } from "@/config/navigation";
import { groupPublicNavigation, isPublicLinkActive } from "@/lib/public-navigation";
import { whatsappHref } from "@/lib/contact-links";
import { isExternalHref } from "@/lib/external-link";
import type { NavigationItem } from "@/types/site";
import { BrandMark } from "@/components/shared/brand-mark";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Container } from "./container";

export function Header({ items = navigationItems, evaluationUrl = "/contacto", evaluationLabel = "Agendar evaluación", whatsapp = "", navigationGroups }: { items?: readonly NavigationItem[]; evaluationUrl?: string; evaluationLabel?: string; whatsapp?: string; navigationGroups?: readonly { id: string; label: string }[] }) {
  const pathname = usePathname();
  const groups = groupPublicNavigation(items, navigationGroups);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [compact, setCompact] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const main = element.querySelector<HTMLElement>(".public-header__main");
    const nav = element.querySelector<HTMLElement>(".public-header__navigation");
    const brand = element.querySelector<HTMLElement>(".public-header__brand");
    const cta = element.querySelector<HTMLElement>(".public-header__cta");
    if (!main || !nav || !brand || !cta) return;
    const measure = () => {
      if (window.innerWidth < 1180) { setCompact(false); return; }
      const style = getComputedStyle(main);
      const available = main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const list = nav.querySelector<HTMLElement>(":scope > ul");
      if (!list) return;
      // Absolutely positioned dropdown panels must not inflate the closed menu's width.
      const entries = Array.from(list.children) as HTMLElement[];
      const navWidth = entries.reduce((width, item) => width + item.offsetWidth, 0) + Math.max(0, entries.length - 1) * (parseFloat(getComputedStyle(list).columnGap) || 0);
      const required = brand.offsetWidth + navWidth + cta.offsetWidth + 2 * (parseFloat(style.columnGap) || 24);
      setCompact(required > available);
    };
    const observer = new ResizeObserver(measure);
    [main, nav, brand, cta].forEach(node => observer.observe(node));
    document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [items, evaluationLabel]);
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

  return <header className={"public-header" + (compact ? " public-header--compact" : "")} ref={header}>
    <div className="public-header__utility"><Container>
      <p>Tratamiento ambulatorio especializado en adicciones</p>
      {whatsappUrl && <a aria-label="Conversemos por WhatsApp" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /> <span>Conversemos por WhatsApp</span></a>}
    </Container></div>
    <Container className="public-header__main">
      <Link className="public-header__brand" href="/" onClick={() => setDropdown(null)}><BrandMark priority /></Link>
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
      <EvaluationLink className="public-button public-button--primary public-header__cta" href={evaluationUrl} label={evaluationLabel} />
      <button aria-controls="mobile-navigation" aria-expanded={mobileOpen} aria-label="Abrir menú" className="public-header__toggle" id="mobile-menu-toggle" onClick={openMobile} type="button"><Menu size={24} /><span>Menú</span></button>
    </Container>
    <dialog aria-label="Menú principal" className="public-mobile-menu" id="mobile-navigation" onClick={(event) => { if (event.target === event.currentTarget) closeMobile(); }} onClose={() => setMobileOpen(false)} onKeyDown={cycleMobileFocus} ref={dialog}>
      <div className="public-mobile-menu__inner">
        <div className="public-mobile-menu__header"><BrandMark territory={false} /><button aria-label="Cerrar menú" className="public-header__toggle" onClick={closeMobile} type="button"><X size={24} /></button></div>
        <nav aria-label="Navegación móvil"><Link className="public-mobile-link" href="/" onClick={closeMobile}>Inicio<ArrowRight size={16} /></Link>{groups.map((group) => group.items.length === 1 ? <Link aria-current={isPublicLinkActive(pathname, group.items[0].href) ? "page" : undefined} className="public-mobile-link" href={group.items[0].href} key={group.id} onClick={closeMobile}>{group.label}<ArrowRight size={16} /></Link> : <details className="public-mobile-group" key={group.id} open={group.items.some((item) => isPublicLinkActive(pathname, item.href))}><summary>{group.label}<ChevronDown size={18} /></summary><div>{group.items.map((item) => <Link aria-current={isPublicLinkActive(pathname, item.href) ? "page" : undefined} href={item.href} key={item.href} onClick={closeMobile}>{item.label}<ArrowRight size={15} /></Link>)}</div></details>)}</nav>
        <div className="public-mobile-menu__contact"><EvaluationLink className="public-button public-button--primary" href={evaluationUrl} label={evaluationLabel} onClick={closeMobile} />{whatsappUrl && <a className="public-mobile-menu__whatsapp" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><WhatsAppIcon /> WhatsApp</a>}</div>
      </div>
    </dialog>
  </header>;
}

/** The evaluation button: a route of this site, or an external scheduler opened in a new tab (announced to screen readers). */
function EvaluationLink({ className, href, label, onClick }: { className: string; href: string; label: string; onClick?: () => void }) {
  if (isExternalHref(href)) return <a className={className} href={href} onClick={onClick} rel="noopener noreferrer" target="_blank">{label}<ArrowRight aria-hidden="true" size={16} /><span className="sr-only"> (se abre en una pestaña nueva)</span></a>;
  return <Link className={className} href={href} onClick={onClick}>{label}<ArrowRight size={16} /></Link>;
}

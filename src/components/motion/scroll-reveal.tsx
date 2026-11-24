"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Page content that appears block by block while scrolling. */
const SECTIONS = ".cms-page > section:not(.cms-hero), .public-footer__inner";
/** Lists whose items enter one after another instead of all at once. */
const GROUPS = ".cms-link-cards, .cms-principles, .cms-steps, .cms-rows, .cms-gallery, .cms-team-grid, .cms-pricing, .cms-stats";
const STAGGER_LIMIT = 6;

/**
 * Marks the blocks of the current page so they fade in as they enter the viewport.
 * It works on the existing DOM (no wrapper elements, so sibling-based CSS keeps
 * working), leaves everything already on screen untouched, and does nothing when
 * the person asked for reduced motion. Without JavaScript the content is simply visible.
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const onScreen = (element: Element) => element.getBoundingClientRect().top <= window.innerHeight * 0.92;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          if (element.dataset.revealGroup) element.dataset.revealGroup = "visible";
          else element.dataset.reveal = "visible";
          observer.unobserve(element);
        }
      },
      { rootMargin: "0px 0px -8%" },
    );

    const single = (element: HTMLElement) => {
      if (onScreen(element)) { if (element.dataset.reveal) element.dataset.reveal = "visible"; return; }
      element.classList.add("reveal");
      element.dataset.reveal = "ready";
      observer.observe(element);
    };

    const group = (element: HTMLElement) => {
      if (onScreen(element)) { if (element.dataset.revealGroup) element.dataset.revealGroup = "visible"; return; }
      Array.from(element.children).slice(0, STAGGER_LIMIT).forEach((child, index) => (child as HTMLElement).style.setProperty("--reveal-index", String(index)));
      element.dataset.revealGroup = "ready";
      observer.observe(element);
    };

    document.querySelectorAll<HTMLElement>(SECTIONS).forEach((section) => {
      const inner = section.matches(".cms-page > section") ? (section.firstElementChild as HTMLElement | null) : section;
      if (!inner) return;
      const lists = inner.querySelectorAll<HTMLElement>(GROUPS);
      if (lists.length === 0) { single(inner); return; }
      inner.querySelectorAll<HTMLElement>(".cms-section-heading").forEach(single);
      lists.forEach(group);
    });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

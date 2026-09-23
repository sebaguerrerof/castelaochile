"use client";

import { useLayoutEffect, useRef } from "react";

import { resetScrollForNewRoute } from "@/lib/route-scroll";

/**
 * Animates only the route content. The persistent root layout keeps navigation,
 * footer and the global WhatsApp action stable between client-side navigations.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Runs once per real route entry (templates don't remount for same-page hash links).
    resetScrollForNewRoute();

    const element = elementRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    element.dataset.pageTransition = "entering";
    const clearTransition = () => delete element.dataset.pageTransition;
    element.addEventListener("animationend", clearTransition, { once: true });

    return () => element.removeEventListener("animationend", clearTransition);
  }, []);

  return <div className="page-transition" ref={elementRef}>{children}</div>;
}
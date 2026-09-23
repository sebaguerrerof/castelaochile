"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type RevealProps = React.ComponentProps<"div"> & {
  delay?: "none" | "sm" | "md" | "lg";
  origin?: "bottom" | "left" | "right";
};

/**
 * Progressive disclosure without an animation dependency. Content stays
 * visible on the server and is only prepared for a reveal after hydration.
 */
export function Reveal({ children, className, delay = "none", origin = "bottom", ...props }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyVisible = element.getBoundingClientRect().top <= window.innerHeight * 0.9;

    if (reducedMotion || alreadyVisible || !("IntersectionObserver" in window)) {
      element.dataset.reveal = "visible";
      return;
    }

    element.dataset.reveal = "ready";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          element.dataset.reveal = "visible";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8%" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn("reveal", className)}
      data-reveal-delay={delay}
      data-reveal-origin={origin}
      ref={elementRef}
      {...props}
    >
      {children}
    </div>
  );
}

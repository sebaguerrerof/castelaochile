"use client";

let cameFromHistoryNavigation = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    cameFromHistoryNavigation = true;
  });
}

/**
 * Jumps a freshly entered route to the top, unless the browser is restoring
 * back/forward history or the URL targets an intentional `#hash` anchor.
 * `instant` bypasses the global smooth-scroll CSS so the hero never gets
 * skipped by an interrupted animated scroll.
 */
export function resetScrollForNewRoute() {
  if (typeof window === "undefined") return;

  if (cameFromHistoryNavigation) {
    cameFromHistoryNavigation = false;
    return;
  }

  if (window.location.hash) return;

  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

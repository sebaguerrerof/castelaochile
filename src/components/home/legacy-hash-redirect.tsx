"use client";

import { useEffect } from "react";

import { getLegacyHashRoute } from "@/lib/legacy-hash-route";

/** Keeps historical one-page links useful after the move to real routes. */
export function LegacyHashRedirect() {
  useEffect(() => {
    const route = getLegacyHashRoute(window.location.hash);
    if (route) window.location.replace(route);
  }, []);

  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    lastPath.current = pathname;
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view", path: pathname }),
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true,
    });
  }, [pathname]);
  return null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { analyticsConsentEvent, readAnalyticsConsent } from "@/lib/analytics-policy";

function subscribeConsent(callback: () => void) {
  window.addEventListener(analyticsConsentEvent, callback);
  window.addEventListener("focus", callback);
  return () => { window.removeEventListener(analyticsConsentEvent, callback); window.removeEventListener("focus", callback); };
}
function getConsent() { return readAnalyticsConsent(document.cookie) ?? "pending"; }
const getServerConsent = () => "loading";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lastView = useRef<{ path: string; eventId: string } | null>(null);
  const withdrawing = useRef(false);
  const activeRequests = useRef(new Set<AbortController>());

  useEffect(() => {
    if (consent !== "accepted") { lastView.current = null; activeRequests.current.forEach((request) => request.abort()); return; }
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api") || withdrawing.current) return;
    if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    // Preserve one event ID through effect replays and retries; revisiting a route gets a new ID.
    if (lastView.current?.path !== pathname) lastView.current = { path: pathname, eventId: crypto.randomUUID() };
    const view = lastView.current;
    const controller = new AbortController();
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const send = async () => {
      if (document.visibilityState !== "visible" || getConsent() !== "accepted" || withdrawing.current) return;
      activeRequests.current.add(controller);
      try {
        const response = await fetch("/api/analytics", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "page_view", path: view.path, eventId: view.eventId }),
          cache: "no-store", credentials: "same-origin", keepalive: true, signal: controller.signal,
        });
        if (!response.ok && response.status >= 500) throw new Error("Analytics unavailable");
      } catch {
        if (!disposed && !controller.signal.aborted && ++attempts < 3) timer = setTimeout(() => void send(), attempts * 1500);
      }
      finally { activeRequests.current.delete(controller); }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void send(); };
    void send();
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [pathname, consent]);

  async function choose(accepted: boolean) {
    setPending(true); setError("");
    if (!accepted) { withdrawing.current = true; activeRequests.current.forEach((request) => request.abort()); }
    try {
      const response = await fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted }), credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Consent could not be saved");
      withdrawing.current = false;
      setPreferencesOpen(false);
      window.dispatchEvent(new Event(analyticsConsentEvent));
    } catch { setError("No pudimos guardar tu preferencia. Inténtalo nuevamente."); }
    finally { setPending(false); }
  }

  const visible = consent !== "loading" && (consent === "pending" || preferencesOpen);
  return <>
    <div className="analytics-preferences"><button aria-controls="analytics-consent" aria-expanded={visible} onClick={() => { setError(""); setPreferencesOpen(true); }} type="button">Preferencias de privacidad</button></div>
    {visible && <section aria-labelledby="analytics-consent-title" className="analytics-consent" id="analytics-consent">
      <div><h2 id="analytics-consent-title">Tú decides sobre la analítica</h2><p>Con tu permiso, usamos una cookie durante 180 días para contar navegadores y conocer las páginas más visitadas. No guardamos tu IP ni datos de formularios. Puedes rechazarla o retirar tu permiso aquí cuando quieras.</p><Link href="/privacidad-analitica">Cómo funciona y qué guardamos</Link></div>
      <div className="analytics-consent-actions"><button className="public-button analytics-choice" disabled={pending} onClick={() => void choose(false)} type="button">Rechazar analítica</button><button className="public-button analytics-choice" disabled={pending} onClick={() => void choose(true)} type="button">Aceptar analítica</button>{consent !== "pending" && <button disabled={pending} onClick={() => setPreferencesOpen(false)} type="button">Cerrar preferencias</button>}</div>
      {error && <p className="analytics-consent-error" role="alert">{error}</p>}
    </section>}
  </>;
}

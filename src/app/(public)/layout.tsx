import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { cookies } from "next/headers";
import { readAnalyticsConsent } from "@/lib/analytics-policy";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FloatingWhatsApp } from "@/components/shared/floating-whatsapp";
import { isAnalyticsEnabled } from "@/lib/runtime-config";
import { getCmsNavigation, getSiteSettings, settingsContact } from "@/lib/cms/repository";
import { JsonLd } from "@/components/cms/cms-page";
import { siteConfig } from "@/config/site";

import "./public-content.css";
import "./public-design.css";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = isAnalyticsEnabled();
  const initialConsent = analyticsEnabled ? readAnalyticsConsent((await cookies()).toString()) : null;
  const [items, settings] = await Promise.all([getCmsNavigation(), getSiteSettings()]);
  return <div className="public-site">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: siteConfig.name, url: siteConfig.url, ...(settings.email ? { email: settings.email } : {}), ...(settings.phone ? { telephone: settings.phone } : {}), sameAs: [settings.instagram, settings.facebook, settings.linkedin].filter(Boolean), ...(settings.streetAddress ? { address: { "@type": "PostalAddress", streetAddress: settings.streetAddress, addressLocality: settings.city, addressRegion: settings.region, addressCountry: settings.country } } : {}) }} />
    <Header evaluationLabel={settings.evaluationLabel} evaluationUrl={settings.evaluationUrl} items={items} whatsapp={settings.whatsapp} />
    <main id="main-content">{children}</main>
    <Footer contact={settingsContact(settings)} items={items} notice={settings.footerNotice} />
    <FloatingWhatsApp whatsapp={settings.whatsapp || null} />
    {analyticsEnabled && <AnalyticsTracker initialConsent={initialConsent} />}
  </div>;
}

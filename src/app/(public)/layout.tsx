import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { cookies } from "next/headers";
import { readAnalyticsConsent } from "@/lib/analytics-policy";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { FloatingWhatsApp } from "@/components/shared/floating-whatsapp";
import { isAnalyticsEnabled } from "@/lib/runtime-config";
import { getCmsNavigation, getSiteSettings, settingsContact } from "@/lib/cms/repository";
import { JsonLd } from "@/components/cms/cms-page";
import { organizationJsonLd } from "@/lib/seo-schema";
import { siteConfig } from "@/config/site";

import "./public-content.css";
import "./public-design.css";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = isAnalyticsEnabled();
  const initialConsent = analyticsEnabled ? readAnalyticsConsent((await cookies()).toString()) : null;
  const [items, settings] = await Promise.all([getCmsNavigation(), getSiteSettings()]);
  return <div className="public-site">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <JsonLd data={organizationJsonLd({ name: siteConfig.name, url: siteConfig.url, description: siteConfig.description, email: settings.email, phone: settings.phone, whatsapp: settings.whatsapp, streetAddress: settings.streetAddress, city: settings.city, region: settings.region, country: settings.country, mapsUrl: settings.mapsUrl, sameAs: [settings.instagram, settings.facebook, settings.linkedin] })} />
    <Header evaluationLabel={settings.evaluationLabel} evaluationUrl={settings.evaluationUrl} items={items} navigationGroups={settings.navigationGroups} whatsapp={settings.whatsapp} />
    <ScrollReveal />
    <main id="main-content">{children}</main>
    <Footer contact={settingsContact(settings)} items={items} notice={settings.footerNotice} settings={settings} />
    <FloatingWhatsApp whatsapp={settings.whatsapp || null} />
    {analyticsEnabled && <AnalyticsTracker initialConsent={initialConsent} />}
  </div>;
}

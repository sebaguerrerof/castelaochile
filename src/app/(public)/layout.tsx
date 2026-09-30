import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FloatingWhatsApp } from "@/components/shared/floating-whatsapp";
import { isAnalyticsEnabled } from "@/lib/runtime-config";

import "./public-content.css";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = isAnalyticsEnabled();
  return <>
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <Header />
    <main id="main-content">{children}</main>
    <Footer />
    <FloatingWhatsApp />
    {analyticsEnabled && <AnalyticsTracker />}
  </>;
}

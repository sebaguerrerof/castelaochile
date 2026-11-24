import Image from "next/image";

import { CmsCta } from "@/components/cms/cms-cta";
import { Container } from "@/components/layout/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EditorialParagraphs } from "@/components/shared/editorial-paragraphs";
import { EyeMark } from "@/components/ui/eye-mark";
import { siteConfig } from "@/config/site";
import { visibleEyebrow } from "@/lib/cms/presentation";
import type { BlockData, SiteSettings } from "@/lib/cms/schemas";
import type { CmsPage } from "@/lib/cms/repository";
import { cn } from "@/lib/utils";

type HeroProps = { data: BlockData<"hero">; settings: SiteSettings; page: CmsPage };

/** Page opening. The home page also carries the complete vertical logo. */
export function Hero({ data, settings, page }: HeroProps) {
  const home = page.path === "/";
  const status = visibleEyebrow(data.eyebrow, siteConfig.name);
  return <section className={cn("cms-hero", "cms-hero--" + data.variant, home && "cms-hero--home", data.image ? "cms-hero--with-image" : "cms-hero--text")}>
    {data.image && <><Image alt={data.image.alt} className="cms-hero__image" fetchPriority="high" fill preload quality={60} sizes="100vw" src={data.image.src} unoptimized={data.image.src.startsWith("/api/")} /><div aria-hidden="true" className="cms-hero__veil" /></>}
    <Container className="cms-hero__container">
      {!home && <Breadcrumbs current={page.title} />}
      <div className="cms-hero__layout">
        <div className="cms-hero__copy">
                    <h1>{data.title}</h1>
          {status && <p className="cms-hero__status"><EyeMark />{status}</p>}
          {data.subtitle && <p className="cms-hero__subtitle">{data.subtitle}</p>}
          <EditorialParagraphs text={data.description} className="cms-hero__description" />
          <div className="cms-hero__actions">{data.primaryCta && <CmsCta cta={data.primaryCta} inverted={!!data.image} settings={settings} />}{data.secondaryCta && <CmsCta cta={data.secondaryCta} inverted={!!data.image} secondary settings={settings} />}</div>
        </div>
      </div>
    </Container>
  </section>;
}

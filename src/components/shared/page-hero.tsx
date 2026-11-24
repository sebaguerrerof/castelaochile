import Image from "next/image";

import { Container } from "@/components/layout/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

const DEFAULT_IMAGE = { src: "/images/instituto-sala-azul.webp", alt: "Interior de una sala del Instituto Castelao" };

type PageHeroProps = { title: string; description?: string; current?: string; image?: { src: string; alt: string } };

/**
 * Opening for pages that are not built from CMS blocks (blog, news, privacy).
 * It reuses the markup and styles of the CMS hero so every page opens the same way.
 */
export function PageHero({ title, description, current = title, image = DEFAULT_IMAGE }: PageHeroProps) {
  return <section className="cms-hero cms-hero--blue cms-hero--with-image">
    <Image alt={image.alt} className="cms-hero__image" fetchPriority="high" fill preload quality={60} sizes="100vw" src={image.src} />
    <div aria-hidden="true" className="cms-hero__veil" />
    <Container className="cms-hero__container">
      <Breadcrumbs current={current} />
      <div className="cms-hero__layout">
        <div className="cms-hero__copy">
          <h1>{title}</h1>
          {description && <p className="cms-hero__subtitle">{description}</p>}
        </div>
      </div>
    </Container>
  </section>;
}

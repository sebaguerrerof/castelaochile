import type { ReactNode } from "react";

import type { LocalImageAsset } from "@/config/assets";
import { cn } from "@/lib/utils";

import { Container } from "@/components/layout/container";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { EditorialImage } from "@/components/shared/editorial-image";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: LocalImageAsset;
  current: string;
  variant?: "blue" | "mist" | "warm";
  children?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  current,
  variant = "blue",
  children,
}: PageHeroProps) {
  return (
    <section className={cn("page-hero", `page-hero--${variant}`)}>
      <Container className="page-hero__container">
        <Breadcrumbs current={current} />
        <div className="page-hero__grid">
          <div className="page-hero__copy">
            <p className="page-hero__eyebrow eyebrow">{eyebrow}</p>
            <h1 className="page-hero__title">{title}</h1>
            <p className="page-hero__description">{description}</p>
            {children ? <div className="page-hero__actions page-hero__actions--motion">{children}</div> : null}
          </div>
          <div className="page-hero__image-wrap page-hero__image-wrap--motion">
            <EditorialImage
              asset={image}
              className="page-hero__image"
              priority
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 44vw, 36vw"
            />
            <span aria-hidden="true" className="page-hero__accent" />
          </div>
        </div>
      </Container>
    </section>
  );
}
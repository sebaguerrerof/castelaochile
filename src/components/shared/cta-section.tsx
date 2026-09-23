import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

type CTASectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

export function CTASection({ eyebrow, title, description, href, label }: CTASectionProps) {
  return (
    <section className="cta-section">
      <Container>
        <div className="cta-section__inner">
          <div>
            <p className="eyebrow text-primary-foreground/75">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <Link className={buttonVariants({ variant: "inverted", size: "lg" })} href={href}>
            {label}
          </Link>
        </div>
      </Container>
    </section>
  );
}
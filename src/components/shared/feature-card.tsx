import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  variant?: "default" | "editorial";
  className?: string;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  eyebrow,
  variant = "default",
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "feature-card",
        variant === "editorial" && "feature-card--editorial",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="feature-card__icon">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </span>
        {eyebrow ? <span className="feature-card__eyebrow">{eyebrow}</span> : null}
      </div>
      <h3 className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
    </article>
  );
}

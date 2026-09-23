import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type PageLinkCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  id?: string;
  className?: string;
};

export function PageLinkCard({ href, eyebrow, title, description, id, className }: PageLinkCardProps) {
  return (
    <article className={cn("page-link-card", className)} id={id}>
      <p className="page-link-card__eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link aria-label={`${title}: abrir página`} href={href}>
        Ver sección <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}
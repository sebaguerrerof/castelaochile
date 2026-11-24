import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { whatsappHref } from "@/lib/contact-links";
import { isExternalHref } from "@/lib/external-link";
import type { BlockData, SiteSettings } from "@/lib/cms/schemas";

type CmsCtaProps = { cta: BlockData<"cta">["primaryCta"]; settings: SiteSettings; inverted?: boolean; secondary?: boolean };

/** Resolves where a CMS button points and renders it with the shared button variants. */
export function CmsCta({ cta, settings, inverted = false, secondary = false }: CmsCtaProps) {
  const href = cta.target === "whatsapp" ? whatsappHref(settings.whatsapp) : cta.target === "evaluation" ? settings.evaluationUrl : cta.href;
  if (!href) return null;
  const classes = buttonVariants({ variant: inverted ? secondary ? "invertedOutline" : "inverted" : secondary || cta.target === "whatsapp" ? "outline" : "primary", className: "public-button" });
  const content = <>{cta.label || settings.evaluationLabel}{cta.target === "whatsapp" ? <WhatsAppIcon className="public-button__icon" /> : <ArrowRight size={18} />}</>;
  return isExternalHref(href) || !href.startsWith("/") ? <a className={classes} href={href} rel="noopener noreferrer" target="_blank">{content}<span className="sr-only"> (se abre en una pestaña nueva)</span></a> : <Link className={classes} href={href}>{content}</Link>;
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { buttonVariants } from "@/components/ui/button";
import { whatsappHref } from "@/lib/contact-links";
import type { BlockData, SiteSettings } from "@/lib/cms/schemas";

type CmsCtaProps = { cta: BlockData<"cta">["primaryCta"]; settings: SiteSettings; inverted?: boolean; secondary?: boolean };

/** Resolves where a CMS button points and renders it with the shared button variants. */
export function CmsCta({ cta, settings, inverted = false, secondary = false }: CmsCtaProps) {
  const href = cta.target === "whatsapp" ? whatsappHref(settings.whatsapp) : cta.target === "evaluation" ? settings.evaluationUrl : cta.href;
  if (!href) return null;
  const classes = buttonVariants({ variant: inverted ? secondary ? "invertedOutline" : "inverted" : secondary || cta.target === "whatsapp" ? "outline" : "primary", className: "public-button" });
  const content = <>{cta.label || settings.evaluationLabel}{cta.target === "whatsapp" ? <WhatsAppIcon className="public-button__icon" /> : <ArrowRight size={18} />}</>;
  return href.startsWith("/") ? <Link className={classes} href={href}>{content}</Link> : <a className={classes} href={href} rel="noopener noreferrer" target="_blank">{content}</a>;
}

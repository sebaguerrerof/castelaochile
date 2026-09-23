import Link from "next/link";

import { contactConfig, whatsappGreeting } from "@/config/contact";
import { whatsappHref } from "@/lib/contact-links";

import { WhatsAppIcon } from "./whatsapp-icon";

type FloatingWhatsAppProps = {
  whatsapp?: string | null;
};

/** Global action; it is intentionally useful even before the channel is confirmed. */
export function FloatingWhatsApp({
  whatsapp = contactConfig.whatsapp,
}: FloatingWhatsAppProps) {
  const href = whatsappHref(whatsapp, whatsappGreeting);

  if (!href) {
    return (
      <Link
        aria-label="WhatsApp próximamente. Ir a la página de contacto"
        className="floating-whatsapp floating-whatsapp--preview"
        data-tooltip="WhatsApp próximamente"
        href="/contacto"
      >
        <WhatsAppIcon className="size-6" />
        <span aria-hidden="true" className="floating-whatsapp__label">Próximamente</span>
      </Link>
    );
  }

  return (
    <a
      aria-label="Contactar por WhatsApp"
      className="floating-whatsapp"
      data-tooltip="Contactar por WhatsApp"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <WhatsAppIcon className="size-6" />
      <span aria-hidden="true" className="floating-whatsapp__label">WhatsApp</span>
    </a>
  );
}

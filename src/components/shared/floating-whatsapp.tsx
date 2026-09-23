import { contactConfig, whatsappGreeting } from "@/config/contact";
import { whatsappHref } from "@/lib/contact-links";

import { WhatsAppIcon } from "./whatsapp-icon";

type FloatingWhatsAppProps = {
  whatsapp?: string | null;
  preview?: boolean;
};

/** Renders globally only when a confirmed Chilean WhatsApp number exists. */
export function FloatingWhatsApp({
  whatsapp = contactConfig.whatsapp,
  preview = false,
}: FloatingWhatsAppProps) {
  const href = whatsappHref(whatsapp, whatsappGreeting);

  if (!href) {
    if (!preview) return null;
    return (
      <span aria-label="Vista local: WhatsApp pendiente de configuración" className="floating-whatsapp floating-whatsapp--preview">
        <WhatsAppIcon className="size-6" />
      </span>
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

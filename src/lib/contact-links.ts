import type { ContactAction, ContactConfig } from "@/types/site";

function cleanPhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

export function phoneHref(phone: string | null) {
  if (!phone) return null;
  const cleaned = cleanPhone(phone);
  return /^\+?\d{7,15}$/.test(cleaned) ? `tel:${cleaned}` : null;
}

export function whatsappHref(
  whatsapp: string | null,
  greeting?: string,
) {
  if (!whatsapp) return null;
  if (!whatsapp.trim().startsWith("+56")) return null;
  const digits = whatsapp.replace(/\D/g, "");
  // Chilean mobile WhatsApp: +56 9 followed by eight local digits.
  if (!/^569\d{8}$/.test(digits)) return null;
  const baseUrl = `https://wa.me/${digits}`;
  return greeting?.trim() ? `${baseUrl}?text=${encodeURIComponent(greeting.trim())}` : baseUrl;
}

export function emailHref(email: string | null) {
  if (!email) return null;
  const normalized = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? `mailto:${normalized}`
    : null;
}

export function getContactActions(config: ContactConfig): ContactAction[] {
  const actions: ContactAction[] = [];
  const phone = phoneHref(config.phone);
  const whatsapp = whatsappHref(config.whatsapp, config.whatsappGreeting);
  const email = emailHref(config.email);

  if (phone) actions.push({ href: phone, icon: "phone", label: "Llamar" });
  if (whatsapp) actions.push({ href: whatsapp, icon: "message", label: "WhatsApp" });
  if (email) actions.push({ href: email, icon: "mail", label: "Enviar correo" });
  if (config.mapsUrl)
    actions.push({ href: config.mapsUrl, icon: "map", label: "Ver ubicación" });

  return actions;
}

export function hasVerifiedContact(config: ContactConfig) {
  return getContactActions(config).length > 0;
}

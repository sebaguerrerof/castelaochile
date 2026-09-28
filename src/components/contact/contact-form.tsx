"use client";

import { LockKeyhole, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { contactFormConfig } from "@/config/contact-form";
import { parseContactSubmission, type ContactFormErrors } from "@/lib/contact-form-schema";

type ContactFormProps = { enabled: boolean; privacyPolicyUrl: string | null; consentLabel: string | null };

export function ContactForm({ enabled, privacyPolicyUrl, consentLabel }: ContactFormProps) {
  const [messageLength, setMessageLength] = useState(0);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const parsed = parseContactSubmission({ ...payload, consent: form.get("consent") === "on" });
    if (!parsed.success) { setErrors(parsed.errors); return; }
    setPending(true); setErrors({}); setStatus(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ ...parsed.data, sourcePath: window.location.pathname }), cache: "no-store", credentials: "same-origin",
      });
      const result = await response.json().catch(() => null) as { message?: string; errors?: ContactFormErrors } | null;
      if (!response.ok) { setErrors(result?.errors ?? {}); setStatus(result?.message ?? "No pudimos procesar el mensaje. Intenta nuevamente más tarde."); return; }
      event.currentTarget.reset(); setMessageLength(0); setStatus("Tu consulta fue recibida correctamente.");
    } catch { setStatus("No pudimos procesar el mensaje. Intenta nuevamente más tarde."); }
    finally { setPending(false); }
  }

  return <form className="contact-form" noValidate onSubmit={submit}>
    <div className="contact-form__heading"><p className="eyebrow text-primary">Contacto</p><h3 className="font-heading text-2xl font-bold tracking-[-0.035em] text-foreground">Escríbenos una consulta general</h3>{!enabled && <p className="contact-form__notice" role="note">El formulario público permanece cerrado hasta que se aprueben la política de privacidad y los controles operativos. No envía ni guarda datos.</p>}</div>
    <div className="contact-form__fields">
      <label className="contact-form__field" htmlFor="contact-name"><span>Nombre <b aria-hidden="true">*</b></span><input aria-invalid={Boolean(errors.name)} autoComplete="name" disabled={!enabled || pending} id="contact-name" maxLength={100} name="name" required type="text" />{errors.name && <small>{errors.name}</small>}</label>
      <label className="contact-form__field" htmlFor="contact-email"><span>Correo electrónico <b aria-hidden="true">*</b></span><input aria-invalid={Boolean(errors.email)} autoComplete="email" disabled={!enabled || pending} id="contact-email" maxLength={254} name="email" required type="email" />{errors.email && <small>{errors.email}</small>}</label>
      <label className="contact-form__field" htmlFor="contact-phone"><span>Teléfono <em>(opcional)</em></span><input aria-invalid={Boolean(errors.phone)} autoComplete="tel" disabled={!enabled || pending} id="contact-phone" inputMode="tel" maxLength={24} name="phone" type="tel" />{errors.phone && <small>{errors.phone}</small>}</label>
      <label className="contact-form__field contact-form__field--message" htmlFor="contact-message"><span>Consulta breve <em>(máximo {contactFormConfig.maxMessageLength} caracteres)</em></span><textarea aria-describedby="contact-message-notice" disabled={!enabled || pending} id="contact-message" maxLength={contactFormConfig.maxMessageLength} name="message" onInput={(event) => setMessageLength(event.currentTarget.value.length)} rows={4} /><small className="contact-form__sensitive-notice" id="contact-message-notice">{contactFormConfig.copy.sensitiveDataNotice} {messageLength}/{contactFormConfig.maxMessageLength}</small></label>
      <label aria-hidden="true" className="contact-form__honeypot" htmlFor="contact-website">Sitio web<input autoComplete="off" disabled={!enabled || pending} id="contact-website" name="website" tabIndex={-1} type="text" /></label>
    </div>
    {enabled && privacyPolicyUrl && consentLabel && <label className="contact-form__consent"><input disabled={pending} name="consent" required type="checkbox" /> <span>{consentLabel} <a href={privacyPolicyUrl} rel="noreferrer" target="_blank">Política de privacidad</a>.</span>{errors.consent && <small>{errors.consent}</small>}</label>}
    {!enabled && <p className="contact-form__availability" role="status"><LockKeyhole aria-hidden="true" className="size-4" />La recepción se habilitará solo después de validar privacidad, destinatarios y medidas antiabuso.</p>}
    {status && <p className={status.startsWith("Tu consulta") ? "contact-form__status contact-form__status--success" : "contact-form__status contact-form__status--error"} role="status">{status}</p>}
    <Button className="contact-form__submit" disabled={!enabled || pending} size="lg" type="submit"><Send aria-hidden="true" className="size-4" />{pending ? "Enviando…" : enabled ? "Enviar consulta" : "Envío aún no disponible"}</Button>
  </form>;
}

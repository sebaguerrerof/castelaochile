"use client";

import { LockKeyhole, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { contactFormConfig } from "@/config/contact-form";

/**
 * Deliberately presentation-only. It never serializes, stores or sends form
 * values, including during local review. The guarded API remains separate for
 * a future, privacy-approved activation.
 */
export function ContactForm() {
  const [messageLength, setMessageLength] = useState(0);

  return (
    <form
      className="contact-form"
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="contact-form__heading">
        <p className="eyebrow text-primary">Formulario de demostración</p>
        <h3 className="font-heading text-2xl font-bold tracking-[-0.035em] text-foreground">
          Revisa la experiencia de contacto
        </h3>
        <p className="contact-form__notice" id="contact-demo-notice" role="note">
          Formulario de demostración: todavía no envía ni guarda consultas. Para contactar al instituto, utiliza únicamente los canales oficiales disponibles. Actualmente aún no hay canales oficiales publicados en este sitio.
        </p>
      </div>

      <div className="contact-form__fields">
        <label className="contact-form__field" htmlFor="contact-name">
          <span>Nombre <b aria-hidden="true">*</b></span>
          <input autoComplete="name" id="contact-name" maxLength={100} name="name" required type="text" />
        </label>

        <label className="contact-form__field" htmlFor="contact-email">
          <span>Correo electrónico <b aria-hidden="true">*</b></span>
          <input autoComplete="email" id="contact-email" maxLength={254} name="email" required type="email" />
        </label>

        <label className="contact-form__field" htmlFor="contact-phone">
          <span>Teléfono <em>(opcional)</em></span>
          <input autoComplete="tel" id="contact-phone" inputMode="tel" maxLength={24} name="phone" type="tel" />
        </label>

        <label className="contact-form__field contact-form__field--message" htmlFor="contact-message">
          <span>Consulta breve <em>(máximo {contactFormConfig.maxMessageLength} caracteres)</em></span>
          <textarea
            aria-describedby="contact-message-notice"
            id="contact-message"
            maxLength={contactFormConfig.maxMessageLength}
            name="message"
            onInput={(event) => setMessageLength(event.currentTarget.value.length)}
            rows={4}
          />
          <small className="contact-form__sensitive-notice" id="contact-message-notice">
            {contactFormConfig.copy.sensitiveDataNotice} {messageLength}/{contactFormConfig.maxMessageLength}
          </small>
        </label>
      </div>

      <p className="contact-form__availability" id="contact-form-availability" role="status">
        <LockKeyhole aria-hidden="true" className="size-4" />
        El envío se habilitará después de aprobar privacidad, proveedor, receptor y medidas antiabuso.
      </p>
      <Button aria-describedby="contact-demo-notice contact-form-availability" className="contact-form__submit" disabled size="lg" type="submit">
        <Send aria-hidden="true" className="size-4" />
        Envío aún no disponible
      </Button>
    </form>
  );
}
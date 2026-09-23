"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { contactFormConfig, type ContactFormMode } from "@/config/contact-form";
import {
  parseContactSubmission,
  type ContactFormErrors,
  type ContactFormField,
  type ContactFormInput,
} from "@/lib/contact-form-schema";
import { cn } from "@/lib/utils";

type ContactFormProps = {
  mode: Exclude<ContactFormMode, "unavailable">;
  privacyPolicyUrl: string | null;
};

type FormStatus =
  | { tone: "success" | "error"; message: string }
  | null;

const initialValues: ContactFormInput = {
  name: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
  website: "",
};

function errorId(field: ContactFormField) {
  return `contact-${field}-error`;
}

export function ContactForm({ mode, privacyPolicyUrl }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [values, setValues] = useState<ContactFormInput>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<FormStatus>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPreview = mode === "preview";

  function focusFirstError(nextErrors: ContactFormErrors) {
    const firstField = Object.keys(nextErrors)[0] as ContactFormField | undefined;
    if (!firstField) return;
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
    });
  }

  function setField(field: keyof ContactFormInput, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    setStatus(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const parsed = parseContactSubmission(values);
    if (!parsed.success) {
      setErrors(parsed.errors);
      focusFirstError(parsed.errors);
      return;
    }

    setErrors({});
    setStatus(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.status === 204) return;
      const result = (await response.json()) as {
        errors?: ContactFormErrors;
        message?: string;
        ok?: boolean;
      };

      if (response.status === 422 && result.errors) {
        setErrors(result.errors);
        focusFirstError(result.errors);
        return;
      }

      if (!response.ok || !result.ok) {
        setStatus({
          tone: "error",
          message: result.message ?? "No pudimos procesar el mensaje. Intenta nuevamente más tarde.",
        });
        return;
      }

      setValues(initialValues);
      setStatus({
        tone: "success",
        message:
          result.message ??
          (isPreview
            ? "La prueba se validó localmente; no se envió ni se guardó ningún mensaje."
            : "Tu mensaje fue recibido correctamente."),
      });
    } catch {
      setStatus({
        tone: "error",
        message: "No pudimos procesar el mensaje. Comprueba tu conexión e intenta nuevamente.",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" noValidate onSubmit={handleSubmit} ref={formRef}>
      <div className="contact-form__heading">
        <p className="eyebrow text-primary">{isPreview ? "Vista local" : "Primer contacto"}</p>
        <h3 className="font-heading text-2xl font-bold tracking-[-0.035em] text-foreground">
          {isPreview ? "Prueba la experiencia del formulario" : "Escríbenos"}
        </h3>
        {isPreview ? (
          <p className="contact-form__notice" role="note">
            {contactFormConfig.copy.previewNotice}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Envía un mensaje breve al buzón institucional configurado.
          </p>
        )}
      </div>

      <div className="contact-form__fields">
        <label className="contact-form__field" htmlFor="contact-name">
          <span>Nombre <b aria-hidden="true">*</b></span>
          <input
            aria-describedby={errors.name ? errorId("name") : undefined}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            id="contact-name"
            maxLength={100}
            name="name"
            onChange={(event) => setField("name", event.target.value)}
            required
            type="text"
            value={values.name}
          />
          {errors.name ? <small id={errorId("name")}>{errors.name}</small> : null}
        </label>

        <label className="contact-form__field" htmlFor="contact-email">
          <span>Correo electrónico <b aria-hidden="true">*</b></span>
          <input
            aria-describedby={errors.email ? errorId("email") : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            id="contact-email"
            maxLength={254}
            name="email"
            onChange={(event) => setField("email", event.target.value)}
            required
            type="email"
            value={values.email}
          />
          {errors.email ? <small id={errorId("email")}>{errors.email}</small> : null}
        </label>

        <label className="contact-form__field" htmlFor="contact-phone">
          <span>Teléfono <em>(opcional)</em></span>
          <input
            aria-describedby={errors.phone ? errorId("phone") : undefined}
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            id="contact-phone"
            inputMode="tel"
            maxLength={24}
            name="phone"
            onChange={(event) => setField("phone", event.target.value)}
            type="tel"
            value={values.phone}
          />
          {errors.phone ? <small id={errorId("phone")}>{errors.phone}</small> : null}
        </label>

        <label className="contact-form__field contact-form__field--message" htmlFor="contact-message">
          <span>Mensaje <em>(opcional)</em></span>
          <textarea
            aria-describedby={errors.message ? `contact-message-notice ${errorId("message")}` : "contact-message-notice"}
            aria-invalid={Boolean(errors.message)}
            id="contact-message"
            maxLength={contactFormConfig.maxMessageLength}
            name="message"
            onChange={(event) => setField("message", event.target.value)}
            rows={4}
            value={values.message}
          />
          <small className="contact-form__sensitive-notice" id="contact-message-notice">
            {contactFormConfig.copy.sensitiveDataNotice} {values.message.length}/{contactFormConfig.maxMessageLength}
          </small>
          {errors.message ? <small id={errorId("message")}>{errors.message}</small> : null}
        </label>
      </div>

      <div aria-hidden="true" className="contact-form__honeypot">
        <label htmlFor="contact-website">No completes este campo</label>
        <input
          autoComplete="off"
          id="contact-website"
          name="website"
          onChange={(event) => setField("website", event.target.value)}
          tabIndex={-1}
          type="text"
          value={values.website}
        />
      </div>

      <label className={cn("contact-form__consent", errors.consent && "contact-form__consent--error")}>
        <input
          aria-describedby={errors.consent ? errorId("consent") : undefined}
          aria-invalid={Boolean(errors.consent)}
          checked={values.consent}
          name="consent"
          onChange={(event) => setField("consent", event.target.checked)}
          required
          type="checkbox"
        />
        <span>
          {isPreview ? (
            "Entiendo que esta es una prueba local y no incluiré datos reales."
          ) : (
            <>
              He leído y acepto la{" "}
              <a href={privacyPolicyUrl ?? undefined} rel="noopener noreferrer" target="_blank">
                Política de privacidad institucional
              </a>
              .
            </>
          )}
        </span>
      </label>
      {errors.consent ? <small className="contact-form__consent-error" id={errorId("consent")}>{errors.consent}</small> : null}

      {status ? (
        <p className={cn("contact-form__status", `contact-form__status--${status.tone}`)} role="status">
          {status.message}
        </p>
      ) : null}

      <Button className="contact-form__submit" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
        {isSubmitting ? "Validando…" : isPreview ? "Probar validación local" : "Enviar mensaje"}
      </Button>
    </form>
  );
}

import { contactFormConfig } from "../config/contact-form.ts";

export type ContactFormField = "name" | "email" | "phone" | "message" | "consent";

export type ContactFormInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  website: string;
};

export type ContactSubmission = Omit<ContactFormInput, "website">;
export type ParsedContactSubmission = ContactSubmission & Pick<ContactFormInput, "website">;

export type ContactFormErrors = Partial<Record<ContactFormField, string>>;

export type ContactValidationResult =
  | { success: true; data: ParsedContactSubmission }
  | { success: false; errors: ContactFormErrors };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedPhonePattern = /^\+?[\d\s().-]+$/;

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSingleLine(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeMultiline(value: string) {
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
}

function normalizePhone(value: string) {
  const trimmed = normalizeSingleLine(value);
  if (!trimmed) return "";
  if (!allowedPhonePattern.test(trimmed)) return trimmed;
  return trimmed.replace(/[^+\d]/g, "");
}

/**
 * Shared validation for browser and server. Zod is not part of this project,
 * so this small parser is kept dependency-free and returns typed errors.
 */
export function parseContactSubmission(input: unknown): ContactValidationResult {
  const candidate = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = normalizeSingleLine(stringValue(candidate.name));
  const email = normalizeSingleLine(stringValue(candidate.email)).toLowerCase();
  const phone = normalizePhone(stringValue(candidate.phone));
  const message = normalizeMultiline(stringValue(candidate.message));
  const website = normalizeSingleLine(stringValue(candidate.website));
  const consent = candidate.consent === true;
  const errors: ContactFormErrors = {};

  if (name.length < 2 || name.length > 100) {
    errors.name = "Ingresa tu nombre entre 2 y 100 caracteres.";
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (phone && (!allowedPhonePattern.test(stringValue(candidate.phone)) || !/^\+?\d{7,15}$/.test(phone))) {
    errors.phone = "Ingresa un teléfono válido o deja este campo vacío.";
  }

  if (message.length > contactFormConfig.maxMessageLength) {
    errors.message = `El mensaje no puede superar ${contactFormConfig.maxMessageLength} caracteres.`;
  }

  if (!consent) {
    errors.consent = "Debes confirmar la información indicada para continuar.";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: { name, email, phone, message, consent, website },
  };
}

export function isValidContactEmail(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length <= 254 && emailPattern.test(normalized);
}

export function isApprovedPrivacyUrl(value: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

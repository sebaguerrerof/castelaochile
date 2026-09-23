export const contactFormConfig = {
  /**
   * This stays false until the institute approves a real public policy URL
   * and its final consent wording. It is intentionally not environment-driven.
   */
  privacyPolicyApproved: false,
  privacyPolicyUrl: null as string | null,
  localPreviewEnabled: true,
  maxMessageLength: 500,
  rateLimit: {
    maxRequests: 3,
    windowSeconds: 10 * 60,
  },
  copy: {
    sensitiveDataNotice: "No incluyas información médica ni otros datos sensibles.",
    previewNotice:
      "Vista local de validación: no envíes datos reales. Esta prueba no entrega ni guarda mensajes.",
    unavailableTitle: "Canales de contacto en preparación",
    unavailableDescription:
      "El formulario público se activará cuando estén aprobados la política de privacidad, el buzón institucional y las protecciones de envío.",
  },
} as const;

export type ContactFormMode = "active" | "preview" | "unavailable";

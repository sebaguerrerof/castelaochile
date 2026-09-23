import type { ContactSubmission } from "../contact-form-schema.ts";

export type ContactDeliveryResult = { accepted: true } | { accepted: false };

export type ContactProvider = {
  deliver: (submission: ContactSubmission) => Promise<ContactDeliveryResult>;
};

/** Local-only double. It intentionally does not persist, log or forward data. */
export class PreviewContactProvider implements ContactProvider {
  async deliver(): Promise<ContactDeliveryResult> {
    return { accepted: true };
  }
}

type ResendContactProviderOptions = {
  apiKey: string;
  from: string;
  to: string;
  fetcher?: typeof fetch;
};

/** Minimal server-side adapter. No recipient or credential reaches the client. */
export class ResendContactProvider implements ContactProvider {
  private readonly fetcher: typeof fetch;
  private readonly options: ResendContactProviderOptions;

  constructor(options: ResendContactProviderOptions) {
    this.options = options;
    this.fetcher = options.fetcher ?? fetch;
  }

  async deliver(submission: ContactSubmission): Promise<ContactDeliveryResult> {
    const text = [
      "Nuevo mensaje de primer contacto desde Instituto Castelao Chile.",
      "",
      `Nombre: ${submission.name}`,
      `Correo: ${submission.email}`,
      `Teléfono: ${submission.phone || "No informado"}`,
      "",
      "Mensaje:",
      submission.message || "Sin mensaje adicional.",
    ].join("\n");

    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.options.from,
        to: [this.options.to],
        reply_to: submission.email,
        subject: "Nuevo primer contacto — Instituto Castelao Chile",
        text,
      }),
      cache: "no-store",
    });

    if (!response.ok) return { accepted: false };
    const result = (await response.json()) as { id?: unknown };
    return { accepted: typeof result.id === "string" && result.id.length > 0 };
  }
}

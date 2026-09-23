import type { ContactFormErrors } from "../contact-form-schema.ts";
import { parseContactSubmission } from "../contact-form-schema.ts";
import type { ContactProvider } from "./contact-provider.ts";
import type { RateLimiter } from "./rate-limit.ts";

export type ContactSubmissionOutcome =
  | { status: "invalid"; errors: ContactFormErrors }
  | { status: "blocked" }
  | { status: "rate-limited"; retryAfterSeconds: number }
  | { status: "accepted" }
  | { status: "delivery-failed" };

export class ContactSubmissionService {
  private readonly provider: ContactProvider;
  private readonly rateLimiter: RateLimiter;

  constructor(provider: ContactProvider, rateLimiter: RateLimiter) {
    this.provider = provider;
    this.rateLimiter = rateLimiter;
  }

  async submit(input: unknown, clientKey: string): Promise<ContactSubmissionOutcome> {
    const parsed = parseContactSubmission(input);
    if (!parsed.success) return { status: "invalid", errors: parsed.errors };

    // The honeypot is silently ignored and never reaches a provider.
    if (parsed.data.website) return { status: "blocked" };

    try {
      const rateLimit = await this.rateLimiter.check(clientKey);
      if (!rateLimit.allowed) {
        return { status: "rate-limited", retryAfterSeconds: rateLimit.retryAfterSeconds };
      }
      const delivery = await this.provider.deliver(parsed.data);
      return delivery.accepted ? { status: "accepted" } : { status: "delivery-failed" };
    } catch {
      // Fail closed when either the limiter or provider is unavailable. Do not
      // log input, messages, addresses or provider responses here.
      return { status: "delivery-failed" };
    }
  }
}

import { contactFormConfig, type ContactFormMode } from "../../config/contact-form.ts";
import { isApprovedPrivacyUrl, isValidContactEmail } from "../contact-form-schema.ts";
import { ResendContactProvider, PreviewContactProvider } from "./contact-provider.ts";
import { ContactSubmissionService } from "./contact-service.ts";
import { DevelopmentRateLimiter, UpstashRateLimiter } from "./rate-limit.ts";

// One limiter per local server process. Production always uses shared Redis.
const previewRateLimiter = new DevelopmentRateLimiter(contactFormConfig.rateLimit);

type ProductionContactEnvironment = {
  to: string | undefined;
  from: string | undefined;
  resendApiKey: string | undefined;
  upstashUrl: string | undefined;
  upstashToken: string | undefined;
};

function productionEnvironment(): ProductionContactEnvironment {
  return {
    to: process.env.CONTACT_TO_EMAIL,
    from: process.env.CONTACT_FROM_EMAIL,
    resendApiKey: process.env.RESEND_API_KEY,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

function hasProductionInfrastructure(environment: ProductionContactEnvironment) {
  let validRateLimitUrl = false;
  try {
    validRateLimitUrl = new URL(environment.upstashUrl ?? "").protocol === "https:";
  } catch {
    validRateLimitUrl = false;
  }

  return Boolean(
    isValidContactEmail(environment.to) &&
      isValidContactEmail(environment.from) &&
      environment.resendApiKey &&
      validRateLimitUrl &&
      environment.upstashToken,
  );
}

export function getContactFormMode(): ContactFormMode {
  const isProduction = process.env.NODE_ENV === "production";
  const publicFormReady =
    contactFormConfig.privacyPolicyApproved &&
    isApprovedPrivacyUrl(contactFormConfig.privacyPolicyUrl) &&
    hasProductionInfrastructure(productionEnvironment());

  if (isProduction && publicFormReady) return "active";
  if (!isProduction && contactFormConfig.localPreviewEnabled) return "preview";
  return "unavailable";
}

export function createContactSubmissionService(mode: Exclude<ContactFormMode, "unavailable">) {
  if (mode === "preview") {
    return new ContactSubmissionService(
      new PreviewContactProvider(),
      previewRateLimiter,
    );
  }

  const environment = productionEnvironment();
  if (!hasProductionInfrastructure(environment)) {
    throw new Error("Contact delivery is not configured.");
  }

  return new ContactSubmissionService(
    new ResendContactProvider({
      apiKey: environment.resendApiKey!,
      from: environment.from!,
      to: environment.to!,
    }),
    new UpstashRateLimiter(environment.upstashUrl!, environment.upstashToken!, contactFormConfig.rateLimit),
  );
}

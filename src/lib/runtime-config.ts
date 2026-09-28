import { siteConfig } from "@/config/site";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

const isTrue = (value: string | undefined) => value === "true";
const isHttpsUrl = (value: string | undefined) => {
  try { return Boolean(value && new URL(value).protocol === "https:"); } catch { return false; }
};

export const runtimeConfig = {
  contactIntakeEnabled: isTrue(process.env.CONTACT_INTAKE_ENABLED),
  analyticsEnabled: isTrue(process.env.ANALYTICS_ENABLED),
  contactPrivacyApproved: isTrue(process.env.CONTACT_PRIVACY_POLICY_APPROVED),
  contactPrivacyPolicyUrl: process.env.CONTACT_PRIVACY_POLICY_URL,
  contactPrivacyConsentLabel: process.env.CONTACT_PRIVACY_CONSENT_LABEL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  isProductionSite: siteConfig.mode === "production",
} as const;

export { hasSupabasePublicConfig };
export function hasSupabaseSecretConfig() { return hasSupabasePublicConfig() && Boolean(runtimeConfig.supabaseSecretKey); }
export function hasSharedRateLimitConfig() { return isHttpsUrl(runtimeConfig.upstashUrl) && Boolean(runtimeConfig.upstashToken); }
export function hasApprovedContactPrivacy() {
  return runtimeConfig.contactPrivacyApproved && isHttpsUrl(runtimeConfig.contactPrivacyPolicyUrl) && Boolean(runtimeConfig.contactPrivacyConsentLabel?.trim());
}
export function isContactIntakeEnabled() { return runtimeConfig.isProductionSite && runtimeConfig.contactIntakeEnabled && hasApprovedContactPrivacy() && hasSupabaseSecretConfig() && hasSharedRateLimitConfig(); }
export function isAnalyticsEnabled() { return runtimeConfig.isProductionSite && runtimeConfig.analyticsEnabled && hasSupabaseSecretConfig() && hasSharedRateLimitConfig(); }

export class RuntimeConfigurationError extends Error {
  constructor(feature: string) { super(`${feature} is not configured.`); this.name = "RuntimeConfigurationError"; }
}

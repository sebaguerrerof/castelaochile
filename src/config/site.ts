const LOCAL_REVIEW_URL = "http://localhost:3000";

function configuredUrl(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const explicitlyConfiguredUrl = configuredUrl(process.env.NEXT_PUBLIC_SITE_URL);
const vercelDeploymentUrl = configuredUrl(
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
);
const siteMode = process.env.NEXT_PUBLIC_SITE_MODE === "production" ? "production" : "review";

/**
 * Defaults to a non-indexable review deployment. Production must be enabled
 * explicitly and supplied with its approved public URL through Vercel.
 */
export const siteConfig = {
  name: "Instituto Castelao Chile",
  brandName: "Instituto Castelao",
  territory: "Chile",
  locale: "es_CL",
  language: "es-CL",
  mode: siteMode,
  isReview: siteMode === "review",
  url: explicitlyConfiguredUrl ?? vercelDeploymentUrl ?? LOCAL_REVIEW_URL,
  title: "Instituto Castelao Chile | Información institucional",
  description:
    "Información institucional de Instituto Castelao Chile. Un espacio digital de orientación general y contenido en proceso de validación local.",
} as const;

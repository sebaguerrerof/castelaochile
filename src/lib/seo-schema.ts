import { SHARE_IMAGE_PATH } from "./share-image.ts";

type OrganizationInput = {
  name: string;
  url: string;
  description?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  streetAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  mapsUrl?: string;
  sameAs?: Array<string | undefined>;
};

const absolute = (url: string, path: string) => new URL(path, url).toString();

/**
 * schema.org description of the institute. Only data that exists in the site settings is emitted
 * (no opening hours or ratings are invented); empty fields are left out.
 */
export function organizationJsonLd(input: OrganizationInput) {
  const telephone = input.phone || input.whatsapp || "";
  const sameAs = (input.sameAs ?? []).filter((link): link is string => Boolean(link));
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "MedicalBusiness"],
    name: input.name,
    url: input.url,
    logo: absolute(input.url, "/brand/instituto-castelao-vertical.png"),
    image: absolute(input.url, SHARE_IMAGE_PATH),
    ...(input.description ? { description: input.description } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(telephone ? { telephone } : {}),
    ...(telephone || input.email ? { contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", ...(telephone ? { telephone } : {}), ...(input.email ? { email: input.email } : {}), availableLanguage: ["es"], areaServed: "CL" }] } : {}),
    areaServed: { "@type": "Country", name: "Chile" },
    ...(sameAs.length ? { sameAs } : {}),
    ...(input.mapsUrl ? { hasMap: input.mapsUrl } : {}),
    ...(input.streetAddress ? { address: { "@type": "PostalAddress", streetAddress: input.streetAddress, addressLocality: input.city, addressRegion: input.region, addressCountry: input.country } } : {}),
  };
}

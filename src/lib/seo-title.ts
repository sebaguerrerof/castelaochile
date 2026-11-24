/** Longest title (brand included) that search results usually show without cutting it. */
export const MAX_SEO_TITLE = 65;

/**
 * Builds the final `<title>` once, so the brand is never repeated and the title is not padded past
 * what search engines show. Editors often type the brand into the SEO title and the layout template
 * would add it a second time; here the trailing brand is removed and re-added only when it still fits.
 */
export function buildSeoTitle(raw: string, brand: string, max = MAX_SEO_TITLE) {
  const clean = raw.replace(/\s+/g, " ").trim();
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const core = clean.replace(new RegExp(`\\s*[|·–—-]\\s*${escaped}\\s*$`, "i"), "").trim() || clean;
  if (core.toLowerCase() === brand.toLowerCase()) return brand;
  const withBrand = `${core} | ${brand}`;
  return withBrand.length <= max ? withBrand : core;
}

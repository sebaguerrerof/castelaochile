/** True for absolute web addresses (another site), false for routes inside this one. */
export function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href.trim());
}

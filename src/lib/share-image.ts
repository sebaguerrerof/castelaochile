/** Image used when a page has none of its own (social previews). 1200x630 on the corporate blue with the negative logo. */
export const SHARE_IMAGE_PATH = "/share/og-default.jpg";

export function defaultShareImage(alt: string) {
  return { url: SHARE_IMAGE_PATH, width: 1200, height: 630, alt };
}

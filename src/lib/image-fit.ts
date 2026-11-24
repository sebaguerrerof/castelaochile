/** Longest side kept for uploaded photographs: sharp on large screens, far lighter than a camera original. */
export const MAX_IMAGE_SIDE = 2000;

/** Size that fits inside `max` on its longest side, keeping proportions. Never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

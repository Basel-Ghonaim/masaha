/**
 * The numbers a photo is shrunk to: its longest side at most `maxSide` — the server's own `page`
 * bound, which it never enlarges — and the quality the re-encode writes it at. One place, so the
 * geometry and the encoder cannot drift apart.
 */
export const SHRINK_DEFAULTS = { maxSide: 1600, quality: 0.85, mimeType: 'image/jpeg' } as const;

/**
 * The size an image of `width` × `height` takes inside `maxSide` on its longest side: both sides
 * scaled by one ratio, so the shape is kept. A photo already inside the bound is left as it is, and
 * neither side falls below a pixel, which rounding a very lopsided photo could otherwise take.
 */
export function fitInside(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (!(longest > 0) || longest <= maxSide) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const ratio = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

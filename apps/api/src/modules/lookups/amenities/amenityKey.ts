/**
 * An amenity's key, derived from its English name when it is added (decision L6): snake_case, ASCII
 * letters and digits only, accents dropped ("Hot drinks" → `hot_drinks`). Empty when the name has
 * no Latin letter or digit, which the service refuses. Letters with no decomposition, such as ß, ø
 * and æ, are dropped, not transliterated.
 */
export function amenityKey(nameEn: string): string {
  return nameEn
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

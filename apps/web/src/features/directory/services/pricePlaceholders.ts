/**
 * The range's hints in whole shekels: the lowest rounded down, never under 1, the highest up, so
 * neither is a value a bound refuses.
 */
export function pricePlaceholders(
  range: { minAgorot: number; maxAgorot: number } | null | undefined,
): { min: string; max: string } {
  if (range === null || range === undefined) return { min: '', max: '' };
  return {
    // A bound starts at ₪1, so the lowest never hints «0».
    min: String(Math.max(1, Math.floor(range.minAgorot / 100))),
    max: String(Math.ceil(range.maxAgorot / 100)),
  };
}

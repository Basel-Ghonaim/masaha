/**
 * A value inserted into a sentence, isolated (U+2068 … U+2069) so it never reorders the sentence
 * around it, whatever its direction (docs/frontend/design-system/foundation.md §8).
 */
export function isolate(value: string): string {
  return `⁨${value}⁩`;
}

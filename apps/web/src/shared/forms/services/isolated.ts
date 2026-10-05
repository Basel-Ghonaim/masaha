/**
 * A value inserted into a sentence, isolated left to right so it never reorders the sentence around
 * it (docs/frontend/design-system/foundation.md §8).
 */
export function isolated(value: string): string {
  return `\u2066${value}\u2069`;
}

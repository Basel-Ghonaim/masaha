import { TERMS } from './terms';

/**
 * English, the source catalogue: every other catalogue is written in the shape of this one.
 *
 * Four rules keep these lines translatable, and none of them is visible from a value: a key
 * addresses a whole line rather than a fragment, a varying value comes in through a function's
 * named parameters rather than concatenation, no markup travels with text, and a value reads as a
 * line so it can be reflowed.
 */
export const ENGLISH = {
  terms: TERMS,
} as const;

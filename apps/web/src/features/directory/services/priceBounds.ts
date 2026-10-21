import { PRICE_MAX_AGOROT } from '@masaha/shared/spaces';
import { wholeNumberOf } from '@shared/lib';

/** The highest bound, in whole shekels: the contract's ceiling is in agorot. */
export const MAX_SHEKELS = PRICE_MAX_AGOROT / 100;

/** Why a bound is refused: not a whole amount above zero, above the ceiling, or under the minimum. */
export type PriceError = 'invalid' | 'tooHigh' | 'belowMin';

type Bound = { value?: number; error?: PriceError };

/** One bound as typed: blank is none; a whole number of shekels from 1 to the ceiling. */
function boundOf(text: string): Bound {
  const typed = wholeNumberOf(text);
  if (typed === undefined) return {};
  if (typeof typed === 'string' || typed < 1) return { error: 'invalid' };
  if (typed > MAX_SHEKELS) return { error: 'tooHigh' };
  return { value: typed };
}

/**
 * The budget the two fields make, in whole shekels, Arabic-Indic digits read: each bound kept only
 * when it is valid, and a maximum under the minimum refused on the maximum, which is then left out,
 * since the server refuses it.
 */
export function priceBounds(
  minText: string,
  maxText: string,
): { min?: number; max?: number; minError?: PriceError; maxError?: PriceError } {
  const min = boundOf(minText);
  const max = boundOf(maxText);
  const belowMin = min.value !== undefined && max.value !== undefined && max.value < min.value;
  return {
    ...(min.value !== undefined && { min: min.value }),
    ...(min.error !== undefined && { minError: min.error }),
    ...(max.value !== undefined && !belowMin && { max: max.value }),
    ...(max.error !== undefined && { maxError: max.error }),
    ...(belowMin && { maxError: 'belowMin' as const }),
  };
}

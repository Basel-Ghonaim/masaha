import type { Catalogue } from '../shape';
import { ERRORS } from './errors';
import { TERMS } from './terms';
import { VALIDATION } from './validation';

/** The Arabic catalogue, in English's shape. The owner approves its words. */
export const ARABIC = {
  errors: ERRORS,
  terms: TERMS,
  validation: VALIDATION,
} satisfies Catalogue;

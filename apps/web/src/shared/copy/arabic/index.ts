import type { Catalogue } from '../shape';
import { TERMS } from './terms';

/** The Arabic catalogue, in English's shape. The owner approves its words. */
export const ARABIC = {
  terms: TERMS,
} satisfies Catalogue;

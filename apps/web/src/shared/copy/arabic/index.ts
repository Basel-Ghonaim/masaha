import type { Catalogue } from '../shape';
import { ERRORS } from './errors';
import { FORMS } from './forms';
import { PREFERENCES } from './preferences';
import { SITE } from './site';
import { STATUS } from './status';
import { TERMS } from './terms';
import { VALIDATION } from './validation';

/** The Arabic catalogue, in English's shape. The owner approves its words. */
export const ARABIC = {
  errors: ERRORS,
  forms: FORMS,
  preferences: PREFERENCES,
  site: SITE,
  status: STATUS,
  terms: TERMS,
  validation: VALIDATION,
} satisfies Catalogue;

import { AUTH } from './auth';
import { DASHBOARD } from './dashboard';
import { ERRORS } from './errors';
import { FORMS } from './forms';
import { LOOKUPS } from './lookups';
import { PREFERENCES } from './preferences';
import { SITE } from './site';
import { SPACE_LINKS } from './spaceLinks';
import { SPACES } from './spaces';
import { STATUS } from './status';
import { TERMS } from './terms';
import { USERS } from './users';
import { VALIDATION } from './validation';

/**
 * English, the source catalogue: every other catalogue is written in the shape of this one.
 *
 * Four rules keep these lines translatable, and none of them is visible from a value: a key
 * addresses a whole line rather than a fragment, a varying value comes in through a function's
 * named parameters rather than concatenation, no markup travels with text, and a value reads as a
 * line so it can be reflowed.
 */
export const ENGLISH = {
  auth: AUTH,
  dashboard: DASHBOARD,
  errors: ERRORS,
  forms: FORMS,
  lookups: LOOKUPS,
  preferences: PREFERENCES,
  site: SITE,
  spaceLinks: SPACE_LINKS,
  spaces: SPACES,
  status: STATUS,
  terms: TERMS,
  users: USERS,
  validation: VALIDATION,
} as const;

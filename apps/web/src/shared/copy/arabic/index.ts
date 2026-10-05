import type { Catalogue } from '../shape';
import { AUTH } from './auth';
import { DASHBOARD } from './dashboard';
import { ERRORS } from './errors';
import { FORMS } from './forms';
import { PREFERENCES } from './preferences';
import { SITE } from './site';
import { SPACE_LINKS } from './spaceLinks';
import { STATUS } from './status';
import { TERMS } from './terms';
import { USERS } from './users';
import { VALIDATION } from './validation';

/** The Arabic catalogue, in English's shape. The owner approves its words. */
export const ARABIC = {
  auth: AUTH,
  dashboard: DASHBOARD,
  errors: ERRORS,
  forms: FORMS,
  preferences: PREFERENCES,
  site: SITE,
  spaceLinks: SPACE_LINKS,
  status: STATUS,
  terms: TERMS,
  users: USERS,
  validation: VALIDATION,
} satisfies Catalogue;

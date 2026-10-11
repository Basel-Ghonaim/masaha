import type { Catalogue } from '../shape';
import { AUTH } from './auth';
import { DASHBOARD } from './dashboard';
import { ERRORS } from './errors';
import { FORMS } from './forms';
import { LOOKUPS } from './lookups';
import { MAP } from './map';
import { PREFERENCES } from './preferences';
import { SITE } from './site';
import { SPACE_LINKS } from './spaceLinks';
import { SPACES } from './spaces';
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
  lookups: LOOKUPS,
  map: MAP,
  preferences: PREFERENCES,
  site: SITE,
  spaceLinks: SPACE_LINKS,
  spaces: SPACES,
  status: STATUS,
  terms: TERMS,
  users: USERS,
  validation: VALIDATION,
} satisfies Catalogue;

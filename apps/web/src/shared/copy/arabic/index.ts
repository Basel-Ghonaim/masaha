import type { Catalogue } from '../shape';
import { AUTH } from './auth';
import { DASHBOARD } from './dashboard';
import { DIRECTORY } from './directory';
import { ERRORS } from './errors';
import { FORMS } from './forms';
import { LOOKUPS } from './lookups';
import { MAP } from './map';
import { PACKAGES } from './packages';
import { PLATFORM_SETTINGS } from './platformSettings';
import { PREFERENCES } from './preferences';
import { SITE } from './site';
import { SPACE_LINKS } from './spaceLinks';
import { SPACE_SETTINGS } from './spaceSettings';
import { SPACES } from './spaces';
import { STAFF } from './staff';
import { STATUS } from './status';
import { TERMS } from './terms';
import { USERS } from './users';
import { VALIDATION } from './validation';

/** The Arabic catalogue, in English's shape. The owner approves its words. */
export const ARABIC = {
  auth: AUTH,
  dashboard: DASHBOARD,
  directory: DIRECTORY,
  errors: ERRORS,
  forms: FORMS,
  lookups: LOOKUPS,
  map: MAP,
  packages: PACKAGES,
  platformSettings: PLATFORM_SETTINGS,
  preferences: PREFERENCES,
  site: SITE,
  spaceLinks: SPACE_LINKS,
  spaceSettings: SPACE_SETTINGS,
  spaces: SPACES,
  staff: STAFF,
  status: STATUS,
  terms: TERMS,
  users: USERS,
  validation: VALIDATION,
} satisfies Catalogue;

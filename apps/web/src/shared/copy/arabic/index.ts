import type { Catalogue } from '../shape';
import { ANNOUNCEMENTS } from './announcements';
import { AUTH } from './auth';
import { DASHBOARD } from './dashboard';
import { DATA_REPORTS } from './dataReports';
import { DESK } from './desk';
import { DIRECTORY } from './directory';
import { ERRORS } from './errors';
import { FORMS } from './forms';
import { LOOKUPS } from './lookups';
import { MAP } from './map';
import { OCCUPANCY } from './occupancy';
import { PACKAGES } from './packages';
import { PAYMENTS } from './payments';
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
  announcements: ANNOUNCEMENTS,
  auth: AUTH,
  dashboard: DASHBOARD,
  dataReports: DATA_REPORTS,
  desk: DESK,
  directory: DIRECTORY,
  errors: ERRORS,
  forms: FORMS,
  lookups: LOOKUPS,
  map: MAP,
  occupancy: OCCUPANCY,
  packages: PACKAGES,
  payments: PAYMENTS,
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

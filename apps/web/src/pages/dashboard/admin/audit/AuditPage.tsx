import type { AuditTarget } from '@masaha/shared/audit';
import { AuditLog } from '@features/audit';
import { DASHBOARD_PATHS } from '@shared/routing';
import { adminSpacePath, ADMIN_AMENITIES_PATH } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/** The admin's pages a target leads to (D6.1). */
const USERS_PATH = `${DASHBOARD_PATHS.admin}/users`;
const LOOKUPS_PATH = `${DASHBOARD_PATHS.admin}/lookups`;
const REPORTS_PATH = `${DASHBOARD_PATHS.admin}/reports`;
const SETTINGS_PATH = `${DASHBOARD_PATHS.admin}/settings`;

/**
 * Where a target of the platform's log leads: a space to its editor; a person to the users list
 * searched by their name; a governorate or an area to the lookups, an amenity to their amenities'
 * tab; a report to the reports with it open; the platform's settings to their page. Made once, here,
 * so the log keeps its rows from one render to the next.
 */
function linkOf({ type, id, name }: AuditTarget): string | null {
  switch (type) {
    case 'space':
      return id === null ? null : adminSpacePath(id);
    case 'user':
      return name === null ? USERS_PATH : `${USERS_PATH}?q=${encodeURIComponent(name)}`;
    case 'governorate':
    case 'area':
      return LOOKUPS_PATH;
    case 'amenity':
      return ADMIN_AMENITIES_PATH;
    case 'dataReport':
      return id === null ? REPORTS_PATH : `${REPORTS_PATH}?open=${String(id)}`;
    case 'platformSettings':
      return SETTINGS_PATH;
    default:
      return null;
  }
}

/**
 * «سجل التدقيق», the admin's (screen 31): `audit`'s log of the platform's events, each target
 * leading to its page. The guard has checked the admin's role.
 */
export function AuditPage() {
  return (
    <>
      <PageHeader />
      <AuditLog scope="platform" linkOf={linkOf} />
    </>
  );
}

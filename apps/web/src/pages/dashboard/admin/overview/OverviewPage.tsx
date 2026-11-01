import { AdminOverview, type AdminOverviewLinks } from '@features/overview';
import { DASHBOARD_PATHS } from '@shared/routing';
import { ADMIN_SPACES_PATH, adminSpacePath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/** Where the admin's overview leads, each the list that a figure counts (D5.2). */
const LINKS: AdminOverviewLinks = {
  spaces: ADMIN_SPACES_PATH,
  reportsOpen: `${DASHBOARD_PATHS.admin}/reports?status=open`,
  stale: `${ADMIN_SPACES_PATH}?stale=true`,
  unverified: `${ADMIN_SPACES_PATH}?status=unverified`,
  users: `${DASHBOARD_PATHS.admin}/users`,
  space: adminSpacePath,
  // The spaces the admin edits, stale or missing: the card's total equals this list's (158).
  completenessAll: `${ADMIN_SPACES_PATH}?status=editable&stale=true`,
};

/** «نظرة عامة», the admin's (screen 25): `overview`'s summary of the platform, every link this page's. */
export function OverviewPage() {
  return (
    <>
      <PageHeader />
      <AdminOverview links={LINKS} />
    </>
  );
}

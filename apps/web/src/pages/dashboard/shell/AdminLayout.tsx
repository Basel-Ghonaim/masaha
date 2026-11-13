import { useAdminReportsCount } from '@features/data-reports';
import { useCopy } from '@shared/copy';
import { Logo, SidebarHeader } from '@shared/design-system';
import { DASHBOARD_PATHS } from '@shared/routing';
import { ADMIN_NAV } from '../navigation';
import { DashboardLayout } from './DashboardLayout';
import { DashboardNavigation } from './DashboardNavigation';

/**
 * The platform's shell: the admin's fixed header, the wordmark and its area, and its pages grouped by
 * task, the data reports' item counting the reports waiting for the admin.
 */
export function AdminLayout() {
  const copy = useCopy();
  const reportsForAdmin = useAdminReportsCount();

  return (
    <DashboardLayout
      label={copy.dashboard.adminNavigation}
      role={copy.users.roles.ADMIN}
      header={
        <SidebarHeader
          mark={<Logo form="mark" className="size-9" />}
          logo={<Logo className="h-9" />}
        >
          {/* The logo is decorative: the name is read here, once, before the area. */}
          <span className="sr-only">{copy.site.wordmark}</span>
          <span className="truncate text-caption text-muted-foreground">
            {copy.dashboard.platformAdmin}
          </span>
        </SidebarHeader>
      }
    >
      <DashboardNavigation
        base={DASHBOARD_PATHS.admin}
        items={ADMIN_NAV}
        grouped
        badges={
          reportsForAdmin === undefined
            ? {}
            : {
                dataReports: {
                  count: reportsForAdmin,
                  label: copy.dashboard.badges.reportsForAdmin,
                },
              }
        }
      />
    </DashboardLayout>
  );
}

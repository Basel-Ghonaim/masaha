import { useCopy } from '@shared/copy';
import { SidebarHeader } from '@shared/design-system';
import { DASHBOARD_PATHS } from '@shared/routing';
import { ADMIN_NAV } from '../navigation';
import { DashboardLayout } from './DashboardLayout';
import { DashboardNavigation } from './DashboardNavigation';

/** The platform's shell: the admin's fixed header, the wordmark and its area, and its pages. */
export function AdminLayout() {
  const copy = useCopy();

  return (
    <DashboardLayout
      label={copy.dashboard.adminNavigation}
      header={
        <SidebarHeader
          mark={
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground"
            >
              {Array.from(copy.site.wordmark)[0]}
            </span>
          }
        >
          <span className="truncate text-label">{copy.site.wordmark}</span>
          <span className="truncate text-caption text-muted-foreground">
            {copy.dashboard.platformAdmin}
          </span>
        </SidebarHeader>
      }
    >
      <DashboardNavigation base={DASHBOARD_PATHS.admin} items={ADMIN_NAV} />
    </DashboardLayout>
  );
}

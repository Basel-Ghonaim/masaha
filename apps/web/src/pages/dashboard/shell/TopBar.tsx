import { CompactAccountMenu } from '@features/users';
import { useCopy } from '@shared/copy';
import { SidebarTrigger } from '@shared/design-system';
import { DASHBOARD_PATHS } from '@shared/routing';
import { useSession } from '@shared/session';
import type { Ref } from 'react';
import { DashboardLanguageToggle, DashboardThemeToggle } from './toggles';

/**
 * The dashboard's top bar: the drawer's trigger on a phone, the page's title and controls (`slot`,
 * which the page fills through `PageHeader`), the language from a tablet up, the theme, and the
 * account, as its avatar.
 */
export function TopBar({ slot }: { slot: Ref<HTMLDivElement> }) {
  const copy = useCopy();
  const user = useSession((session) => session.user);

  return (
    <header className="sticky top-0 z-sticky flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 py-2 md:px-8">
      <SidebarTrigger label={copy.dashboard.menu} />
      <div ref={slot} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2" />
      <div className="flex items-center gap-1">
        <DashboardLanguageToggle className="hidden md:inline-flex" />
        <DashboardThemeToggle />
        {user && <CompactAccountMenu user={user} dashboardPath={DASHBOARD_PATHS.home} />}
      </div>
    </header>
  );
}

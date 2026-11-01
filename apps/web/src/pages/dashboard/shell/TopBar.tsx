import { CompactAccountMenu } from '@features/users';
import { useCopy } from '@shared/copy';
import { SidebarTrigger } from '@shared/design-system';
import { useSession } from '@shared/session';
import type { Ref } from 'react';
import { DashboardLanguageToggle } from './DashboardLanguageToggle';
import { DashboardThemeToggle } from './DashboardThemeToggle';

/**
 * The dashboard's top bar: the drawer's trigger on a phone, the page's title and controls (`slot`,
 * which the page fills through `PageHeader`), and from 768 px the language, the theme and the account,
 * as its avatar (below it they are the drawer's, DI-10 and SH-005).
 */
export function TopBar({ slot, role }: { slot: Ref<HTMLDivElement>; role: string | undefined }) {
  const copy = useCopy();
  const user = useSession((session) => session.user);

  return (
    <header className="sticky top-0 z-sticky flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 py-2 md:px-8">
      <SidebarTrigger label={copy.dashboard.menu} />
      <div ref={slot} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2" />
      <div className="hidden items-center gap-1 md:flex">
        <DashboardLanguageToggle />
        <DashboardThemeToggle />
        {user && <CompactAccountMenu user={user} role={role} />}
      </div>
    </header>
  );
}

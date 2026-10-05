import { useCopy } from '@shared/copy';
import { SidebarMenuButton, SidebarMenuItem } from '@shared/design-system';
import { Link, useMatch } from 'react-router';
import type { DashboardPageName } from '../navigation';
import { NAVIGATION_ICONS } from './navigationIcons';

/** One page's link, marked as the page shown while its path is the current one. */
export function NavigationItem({
  name,
  to,
  end,
}: {
  name: DashboardPageName;
  to: string;
  end: boolean;
}) {
  const copy = useCopy();
  const Icon = NAVIGATION_ICONS[name];
  const isActive = useMatch({ path: to, end }) !== null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        icon={<Icon aria-hidden />}
        label={copy.dashboard.pages[name]}
        isActive={isActive}
      >
        <Link to={to} />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

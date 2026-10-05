import { useCopy } from '@shared/copy';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@shared/design-system';
import { Link, useMatch } from 'react-router';
import type { DashboardPageName, NavItem } from '../navigation';
import { NAVIGATION_ICONS } from './navigationIcons';

/** One page's link, marked as the page shown while its path is the current one. */
function NavigationItem({ name, to, end }: { name: DashboardPageName; to: string; end: boolean }) {
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

/**
 * A branch's pages in the sidebar, below its path (`base`): the branch's own page is current on its
 * path alone, each other page on its path and below.
 */
export function DashboardNavigation({ base, items }: { base: string; items: readonly NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map(({ name, segment }) => (
          <NavigationItem
            key={name}
            name={name}
            to={segment === '' ? base : `${base}/${segment}`}
            end={segment === ''}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

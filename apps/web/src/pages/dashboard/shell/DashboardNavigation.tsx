import { SidebarGroup, SidebarMenu } from '@shared/design-system';
import type { NavItem } from '../navigation';
import { NavigationItem } from './NavigationItem';

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

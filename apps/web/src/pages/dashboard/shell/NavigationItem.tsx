import { useCopy } from '@shared/copy';
import { SidebarMenuButton, SidebarMenuItem } from '@shared/design-system';
import { Link, useMatch } from 'react-router';
import type { DashboardPageName } from '../navigation';
import { NAVIGATION_ICONS } from './navigationIcons';

/** A count shown at an item's end, such as the new reports, and what it says when read. */
export type NavigationBadge = { count: number; label: string };

/**
 * One page's link, marked as the page shown while its path is the current one. Its count is drawn
 * only above zero.
 */
export function NavigationItem({
  name,
  to,
  end,
  badge,
}: {
  name: DashboardPageName;
  to: string;
  end: boolean;
  badge?: NavigationBadge | undefined;
}) {
  const copy = useCopy();
  const Icon = NAVIGATION_ICONS[name];
  const isActive = useMatch({ path: to, end }) !== null;
  const shown = badge !== undefined && badge.count > 0 ? badge : undefined;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        icon={<Icon aria-hidden />}
        label={copy.dashboard.pages[name]}
        isActive={isActive}
        badge={shown?.count}
        badgeLabel={shown && `${String(shown.count)} ${shown.label}`}
      >
        <Link to={to} />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

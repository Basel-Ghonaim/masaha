import { useCopy } from '@shared/copy';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@shared/design-system';
import { useId } from 'react';
import type { DashboardPageName, NavGroup, NavItem } from '../navigation';
import { NavigationItem, type NavigationBadge } from './NavigationItem';

/** The items in runs of the same group, in their order: a run with no group heads the list. */
function runsOf(items: readonly NavItem[]) {
  const runs: { group: NavGroup | undefined; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = runs.at(-1);
    if (last !== undefined && last.group === item.group) last.items.push(item);
    else runs.push({ group: item.group, items: [item] });
  }
  return runs;
}

/**
 * A branch's pages in the sidebar, below its path (`base`): the branch's own page is current on its
 * path alone, each other page on its path and below. `grouped` draws one group per task under its
 * name (the owner's and the admin's, finding 165); reception's four pages are one list (P3). On the
 * rail the names are read, not shown, and a line divides the groups (the layer's rule).
 */
export function DashboardNavigation({
  base,
  items,
  grouped = false,
  badges = {},
}: {
  base: string;
  items: readonly NavItem[];
  grouped?: boolean;
  badges?: Partial<Record<DashboardPageName, NavigationBadge>>;
}) {
  const links = (run: readonly NavItem[]) => (
    <SidebarMenu>
      {run.map(({ name, segment }) => (
        <NavigationItem
          key={name}
          name={name}
          to={segment === '' ? base : `${base}/${segment}`}
          end={segment === ''}
          badge={badges[name]}
        />
      ))}
    </SidebarMenu>
  );

  if (!grouped) return <SidebarGroup>{links(items)}</SidebarGroup>;

  return runsOf(items).map((run) =>
    run.group === undefined ? (
      <SidebarGroup key="ungrouped">{links(run.items)}</SidebarGroup>
    ) : (
      <NamedGroup key={run.group} group={run.group}>
        {links(run.items)}
      </NamedGroup>
    ),
  );
}

/** A group of pages, named by its task for assistive technology and, beside the rail, shown. */
function NamedGroup({ group, children }: { group: NavGroup; children: React.ReactNode }) {
  const copy = useCopy();
  const id = useId();

  return (
    <SidebarGroup role="group" aria-labelledby={id}>
      <SidebarGroupLabel id={id}>{copy.dashboard.groups[group]}</SidebarGroupLabel>
      {children}
    </SidebarGroup>
  );
}

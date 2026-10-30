import type { OwnerOverview } from '@masaha/shared/overview';
import type { Catalogue } from '@shared/copy';
import type { AttentionRowView } from '../types/AttentionRowView';
import type { OwnerOverviewLinks } from '../types/OwnerOverviewLinks';

/**
 * «يحتاج انتباهك»'s rows, in the screen's order (D5.1): each fact group never saved, then each stale
 * one with its days; the open reports, the uncollected visits, the unpriced ones (DI2), the customers
 * who owe — a count, never an amount (OV2) —, the closures awaiting their extension (DI6), each only
 * above zero; and the capacity, when it is not set. None: all is in order.
 */
export function attentionRows(
  attention: OwnerOverview['attention'],
  { copy, links }: { copy: Catalogue; links: OwnerOverviewLinks },
): AttentionRowView[] {
  const words = copy.overview.owner.attention;
  const sections = copy.spaces.editor.sections;
  const rows: AttentionRowView[] = [];

  for (const group of attention.groups.missing) {
    rows.push({
      key: `missing-${group}`,
      title: sections[group],
      badge: words.missing.badge,
      caption: words.missing.caption,
      action: { label: words.review, href: links.group(group) },
    });
  }
  for (const { group, days } of attention.groups.stale) {
    rows.push({
      key: `stale-${group}`,
      title: sections[group],
      badge: words.stale.badge,
      caption: words.stale.caption({ days }),
      action: { label: words.review, href: links.group(group) },
    });
  }

  const counted = (
    key: 'reports' | 'uncollected' | 'unpriced' | 'owing' | 'closures',
    count: number,
    action: AttentionRowView['action'],
  ) => {
    if (count > 0) {
      rows.push({
        key,
        title: words[key].title({ count }),
        badge: null,
        caption: words[key].caption,
        action,
      });
    }
  };
  counted('reports', attention.openReports, { label: words.review, href: links.reports });
  counted('uncollected', attention.uncollectedVisits, {
    label: words.openDesk,
    href: links.desk,
  });
  counted('unpriced', attention.unpricedVisits, {
    label: words.openDesk,
    href: links.deskUnpriced,
  });
  counted('owing', attention.customersOwing, { label: words.view, href: links.debts });
  counted('closures', attention.closuresAwaitingExtension, {
    label: words.review,
    href: links.announcements,
  });

  if (!attention.capacitySet) {
    rows.push({
      key: 'capacity',
      title: words.capacity.title,
      badge: null,
      caption: words.capacity.caption,
      action: { label: words.capacity.action, href: links.capacity },
    });
  }
  return rows;
}

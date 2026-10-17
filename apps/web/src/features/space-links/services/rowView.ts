import type { AdminSpaceRow } from '@masaha/shared/space-links';
import type { FactGroup } from '@masaha/shared/spaces';
import type { Catalogue } from '@shared/copy';
import { isolate } from '@shared/localisation';
import type { AdminSpaceRowView, BadgeView } from '../types/AdminSpaceRowView';
import { updatedOn } from './updatedOn';

// A space's state is two facts (the owner's A3): a verified space is confirmed by its owner, an
// unverified one is not yet, a hidden one needs the admin's eye and a deleted one is gone for now.
const VERIFICATION_VARIANTS = {
  verified: 'success',
  unverified: 'neutral',
} as const;

/**
 * One row of the admin's spaces list in the interface's language. Its state's facts and its stale and
 * missing groups are the server's; this only words them. A space's English name is required and its Arabic
 * one optional, so the Arabic interface shows the English name when there is no other, marked as
 * English (docs/frontend/localisation.md › Content in two languages).
 */
export function rowView(
  row: AdminSpaceRow,
  {
    lines,
    english,
    now,
  }: { lines: Catalogue['spaceLinks']['adminList']; english: boolean; now: Date },
): AdminSpaceRowView {
  const groups = (list: FactGroup[]) =>
    list.map((group) => lines.groups[group]).join(lines.separator);
  const freshness: BadgeView[] = [
    ...(row.staleGroups.length > 0
      ? [{ label: lines.stale({ groups: groups(row.staleGroups) }), variant: 'warning' as const }]
      : []),
    ...(row.missingGroups.length > 0
      ? [
          {
            label: lines.missing({ groups: groups(row.missingGroups) }),
            variant: 'warning' as const,
          },
        ]
      : []),
  ];
  const deleted = row.deletedAt !== null;
  const state: BadgeView[] = deleted
    ? []
    : [
        {
          label: lines.states[row.isVerified ? 'verified' : 'unverified'],
          variant: VERIFICATION_VARIANTS[row.isVerified ? 'verified' : 'unverified'],
        },
        ...(row.isHidden ? [{ label: lines.states.hidden, variant: 'warning' as const }] : []),
      ];
  const deletedOn =
    row.deletedAt === null
      ? null
      : lines.deletedOn({ date: updatedOn(row.deletedAt, english ? 'en' : 'ar', now) });
  const arabicName = english ? null : row.nameAr;
  // Each name isolated, so a name in one direction never reorders its neighbours.
  const owners =
    row.owners.length > 0
      ? row.owners.map(({ name }) => isolate(name)).join(lines.separator)
      : null;

  return {
    id: row.id,
    row,
    name:
      english || arabicName !== null
        ? { text: arabicName ?? row.nameEn }
        : { text: row.nameEn, lang: 'en', dir: 'ltr' },
    area: english ? row.area.nameEn : row.area.nameAr,
    state,
    deletedOn,
    owners,
    ownersLine: {
      shown: lines.owners({ owners: owners ?? '—' }),
      heard: lines.owners({ owners: owners ?? lines.noOwner }),
    },
    // A deleted row carries no freshness: nothing will fill its gaps, and the one muted line by its
    // name says it is gone. A live row's is the stale groups, the missing ones, or that it is fresh.
    freshness: deleted
      ? []
      : freshness.length > 0
        ? freshness
        : [{ label: lines.upToDate, variant: 'success' }],
    lastUpdated: updatedOn(row.lastUpdatedAt, english ? 'en' : 'ar', now),
  };
}

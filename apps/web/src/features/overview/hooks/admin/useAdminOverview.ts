import { useCopy } from '@shared/copy';
import { spaceNameOf } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import type { AdminOverviewLinks } from '../../types/AdminOverviewLinks';
import { useLoadFailure } from '../useLoadFailure';
import { useAdminOverviewQuery } from './useAdminOverviewQuery';

/** How many of «اكتمال البيانات»'s spaces the card lists; the rest are behind «عرض الكل». */
const FIRST = 5;

/**
 * The admin's overview of the platform (screen 25, D5.2), ready to render: five tiles, each a link
 * with its helper (DI7, DI8); «اكتمال البيانات», at most five of the spaces the admin edits, each
 * missing group a warning and never destructive (A8), each stale one with its days, and «عرض الكل»
 * with the total past five (158); and the privacy note. Its states: loading, failed or offline with a
 * retry, ready.
 */
export function useAdminOverview(links: AdminOverviewLinks) {
  const copy = useCopy();
  const words = copy.overview.admin;
  const english = useLanguage() === 'en';
  const result = useAdminOverviewQuery();
  const answer = result.data;
  const failure = useLoadFailure(answer === undefined ? result.error : null, () => {
    void result.refetch();
  });

  if (answer === undefined) {
    return result.isPending
      ? { state: 'loading' as const, failure }
      : { state: 'failed' as const, failure };
  }

  const { spaces, reports, completeness } = answer;
  const sections = copy.spaces.editor.sections;
  const states = copy.spaceLinks.adminList.states;

  return {
    state: 'ready' as const,
    failure,
    tiles: {
      label: words.tiles.label,
      items: [
        {
          key: 'spaces',
          label: words.tiles.spaces.label,
          value: String(spaces.verified + spaces.unverified + spaces.hidden),
          helper: words.tiles.spaces.helper({
            verified: String(spaces.verified),
            unverified: String(spaces.unverified),
            hidden: String(spaces.hidden),
          }),
          href: links.spaces,
        },
        {
          key: 'reports',
          label: words.tiles.reports.label,
          value: String(reports.open),
          helper: words.tiles.reports.helper({
            admin: String(reports.awaitingAdmin),
            owners: String(reports.awaitingOwners),
          }),
          href: links.reportsOpen,
        },
        {
          key: 'stale',
          label: words.tiles.stale.label,
          value: String(spaces.staleOrMissing),
          helper: words.tiles.stale.helper,
          href: links.stale,
        },
        {
          key: 'unverified',
          label: words.tiles.unverified.label,
          value: String(spaces.unverifiedNoOwner),
          helper: words.tiles.unverified.helper,
          href: links.unverified,
        },
        {
          key: 'users',
          label: words.tiles.users.label,
          value: String(answer.newUsers),
          helper: words.tiles.users.helper,
          href: links.users,
        },
      ],
    },
    completeness: {
      title: words.completeness.title,
      description: words.completeness.description,
      rows: completeness.first.slice(0, FIRST).map((space) => ({
        key: String(space.id),
        name: spaceNameOf(space, english),
        states: [states.unverified, ...(space.hidden ? [states.hidden] : [])],
        groups: [
          ...space.missing.map((group) => ({
            key: `missing-${group}`,
            text: words.completeness.missing({ group: sections[group] }),
          })),
          ...space.stale.map(({ group, days }) => ({
            key: `stale-${group}`,
            text: words.completeness.stale({ group: sections[group], days }),
          })),
        ],
        edit: { label: words.completeness.edit, href: links.space(space.id) },
      })),
      viewAll: {
        label:
          completeness.total > FIRST
            ? words.completeness.viewAllCounted({ total: String(completeness.total) })
            : words.completeness.viewAll,
        href: links.completenessAll,
      },
      none: words.completeness.none,
    },
    privacy: copy.spaces.editor.privacy,
  };
}

/** The admin's overview, ready to render. */
export type AdminOverviewView = ReturnType<typeof useAdminOverview>;

import { useCopy } from '@shared/copy';
import { updatedAgo } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import { pricesTable } from '../../services/pricesView';
import { sectionName } from '../editor/sectionName';
import { useSpaceQuery } from '../editor/useSpaceQuery';

/**
 * An owner's published prices on Packages & prices, read-only (R1): the same table as the profile's
 * «الأسعار المعلنة», its date and its stale badge, and the one way to edit them, the profile's Sheet
 * (`editLink`). Its own loading, failure and not-found states.
 */
export function useSpacePricesCard(spaceId: number, editLink: string) {
  const copy = useCopy();
  const words = copy.spaces.editor;
  const english = useLanguage() === 'en';
  const query = useSpaceQuery('owner', spaceId);
  const space = query.data;

  if (query.error?.status === 404) return { state: 'notFound' as const };
  if (space === undefined) {
    if (query.isPending) return { state: 'loading' as const, label: copy.status.loading };
    return {
      state: 'failed' as const,
      message: words.loadFailed,
      retry: {
        label: copy.status.retry,
        run: () => {
          void query.refetch();
        },
      },
    };
  }

  const date = space.updatedAt.prices;
  return {
    state: 'ready' as const,
    title: sectionName('prices', copy),
    description: words.prices.card.description,
    date:
      date === null
        ? null
        : words.section.updated({ ago: updatedAgo(date, english ? 'en' : 'ar', new Date()) }),
    stale:
      date !== null && space.prices.length > 0 && space.staleGroups.includes('prices')
        ? words.section.stale
        : null,
    empty: space.prices.length === 0 ? words.prices.empty.text : null,
    table: pricesTable(space, words.prices, english),
    edit: { label: words.prices.card.edit, href: editLink },
  };
}

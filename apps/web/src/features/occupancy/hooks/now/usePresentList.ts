import { gazaClockOf } from '@masaha/shared/core';
import type { PresentPerson } from '@masaha/shared/occupancy';
import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { clockOf, priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { stayDuration } from '../../services/stayDuration';
import type { PresentRowView } from '../../types/PresentRowView';
import { useStateNowQuery } from './useStateNowQuery';

/**
 * Who is present at the space now, ready to render: the heading and its count (with the capacity,
 * when the space has one), the list's state (loading, failed with its reference and a retry, empty,
 * or the list), each person in the server's order — their name, kind, since when and for how long at
 * `now`, and a visit's charge so far, the server's — and how many of each kind. A failed refresh
 * keeps the list it shows, and says so.
 */
export function usePresentList(spaceId: number, { now }: { now: Date }) {
  const copy = useCopy();
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const words = copy.occupancy.present;
  const query = useStateNowQuery(spaceId);
  const data = query.data;
  // A failed refetch keeps the list already loaded: only a list that never arrived is an error.
  const { view, blocked } = useRefusalView(
    data === undefined ? query.error : null,
    words.loadFailed,
  );

  const durationOf = (since: string) => {
    const { hours, minutes } = stayDuration(since, now);
    return hours === 0 ? words.minutes({ minutes }) : words.duration({ hours, minutes });
  };
  const detailOf = (person: PresentPerson) => {
    if (person.kind === 'CHECK_IN') return null;
    return person.chargeNowAgorot === null
      ? words.atCheckOut
      : words.soFar({ amount: isolate(priceText(person.chargeNowAgorot, language)) });
  };
  const people = data?.people ?? [];
  const rows = people.map((person): PresentRowView => ({
    key: `${person.kind}-${String(person.id)}`,
    person,
    name: person.name,
    kind: words.kinds[person.kind],
    since: words.since({ time: clockOf(gazaClockOf(new Date(person.since)).minute) }),
    duration: durationOf(person.since),
    detail: detailOf(person),
  }));
  const visits = people.filter(({ kind }) => kind === 'VISIT').length;

  return {
    heading: {
      title: words.title,
      count:
        data === undefined
          ? null
          : data.capacity === null
            ? String(data.present)
            : `${String(data.present)} / ${String(data.capacity)}`,
    },
    label: words.table,
    columns: words.columns,
    state: query.isPending
      ? ('loading' as const)
      : data === undefined
        ? ('failed' as const)
        : people.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    rows,
    summary: words.summary({
      subscribers: words.subscribers({ count: people.length - visits }),
      visits: words.visits({ count: visits }),
    }),
    empty: { title: words.empty.title, text: words.empty.text },
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    refreshFailure: data !== undefined && query.isError ? words.refreshFailed : null,
  };
}

/** Who is present, ready to render. */
export type PresentListView = ReturnType<typeof usePresentList>;

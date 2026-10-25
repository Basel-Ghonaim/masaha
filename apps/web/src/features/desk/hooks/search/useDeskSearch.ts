import { customersQuerySchema } from '@masaha/shared/desk';
import { useCopy } from '@shared/copy';
import { useMediaQuery } from '@shared/design-system';
import { useRefusalView } from '@shared/forms';
import { usePausedSearch } from '@shared/lists';
import { isolate } from '@shared/localisation';
import { useState } from 'react';
import { useCustomersSearchQuery } from './useCustomersSearchQuery';

/** The customers the search shows at most, as the design's results do. */
const SEARCH_LIMIT = 6;

/** A term of digits only, once a phone's separators are removed: it names no visitor. */
const DIGITS = /^[\d\s+\-.()]+$/;

/** The search a text makes: the customers list's `q`, as its schema reads it, or none. */
const searchOf = (text: string) => {
  if (text.trim() === '') return undefined;
  const parsed = customersQuerySchema.safeParse({ q: text });
  return parsed.success ? parsed.data.q : undefined;
};

/**
 * The desk's one search (K1), ready to render: the field (named, with its placeholder; focused on
 * arrival from 768 px only, S10); the term, once typing pauses (400 ms); the customers the server's
 * search finds, the first six, leaving out those present (`present.customerIds`: they are in the
 * first group, the page's); and the visit's check-in, «تسجيل زيارة باسم «X»» — «تسجيل زيارة» for
 * digits, which name no one — the primary only when nothing matched, so two equal buttons never
 * stand side by side (DI-20), with the no-match line (DI-36). The results' count counts the present
 * who match (`present.matches`) and the customers shown. A failed search says so with a retry, never
 * as no match.
 */
export function useDeskSearch(
  spaceId: number,
  {
    present,
  }: {
    present: {
      /** The customers present now, by id. */
      customerIds: ReadonlySet<number>;
      /** How many people present a term matches. */
      matches: (term: string) => number;
    };
  },
) {
  const copy = useCopy();
  const words = copy.desk.search;
  const wide = useMediaQuery('(min-width: 768px)');
  const [term, setTerm] = useState<string | undefined>(undefined);
  const search = usePausedSearch({ q: term, searchOf, write: setTerm });
  const query = useCustomersSearchQuery(
    spaceId,
    term === undefined ? null : { q: term, limit: SEARCH_LIMIT },
  );
  const answer = term === undefined ? undefined : query.data;
  const { view, blocked } = useRefusalView(
    term !== undefined && answer === undefined ? query.error : null,
    words.failed,
  );

  const state =
    term === undefined
      ? ('idle' as const)
      : query.isPending
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : ('ready' as const);
  const rows = (answer?.data ?? []).filter((row) => !present.customerIds.has(row.id));
  const presentMatched = term === undefined ? 0 : present.matches(term);
  const nothing = state === 'ready' && rows.length === 0 && presentMatched === 0;

  return {
    input: {
      label: words.label,
      placeholder: words.placeholder,
      text: search.text,
      change: search.change,
      /** Empties the field and the results at once, as after a check-in started from them. */
      clear: () => {
        search.clear();
        setTerm(undefined);
      },
      autoFocus: wide,
    },
    region: words.region,
    term: term ?? '',
    customers: {
      heading: words.customers,
      state,
      rows,
      /** The next search is loading, the customers before shown meanwhile. */
      busy: query.isPlaceholderData,
      failure: {
        title: words.failed,
        message: view?.message,
        reference: view?.kind === 'refused' ? view.reference : undefined,
        retryLabel: copy.status.retry,
        blocked,
        retry: () => {
          void query.refetch();
        },
      },
    },
    checkIn:
      term === undefined
        ? null
        : DIGITS.test(term)
          ? { label: copy.desk.actions.checkIn, name: '', primary: nothing }
          : { label: words.checkInNamed({ name: isolate(term) }), name: term, primary: nothing },
    none: nothing ? words.none : null,
    count: state === 'ready' ? words.found({ count: presentMatched + rows.length }) : null,
  };
}

/** The desk's search, ready to render. */
export type DeskSearchView = ReturnType<typeof useDeskSearch>;

import { useCopy } from '@shared/copy';
import { paginationView, usePageInRange } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { useState } from 'react';
import type { DirectorySort } from '@masaha/shared/directory';
import { cardViewOf } from '../../services/cardView';
import { focusFilters } from '../../services/focusFilters';
import { requestOf } from '../../services/requestOf';
import type { DirectoryOrder } from '../../types/DirectoryFilters';
import type { DirectoryListView } from '../../types/DirectoryListView';
import { useFiltersPanel } from '../filters/useFiltersPanel';
import { useLocationStatus } from '../near/useLocationStatus';
import { useNearMe } from '../near/useNearMe';
import { useDirectoryFilters } from './useDirectoryFilters';
import { useDirectoryQuery } from './useDirectoryQuery';
import { useFailureView } from './useFailureView';

/**
 * The directory's list, ready to render: the search, the order, the count, the cards a page at a
 * time, the pages, and the words of each state (loading, failed, an empty directory, no match).
 *
 * A failure is read as any refusal is: no connection or no answer says so, any other with its
 * request's reference; too many requests counts down its wait, then offers the retry again. A
 * failed refresh keeps the cards shown. While another page or filter loads, the cards shown stay,
 * the results marked busy. A page past the last shows the last in its place. «Best match» is
 * offered only while a search applies: the server's order then. While near me sorts the list, it is
 * asked by distance from the rounded point, which travels in its header only; «By distance» is then
 * the order shown, and choosing another stops it.
 */
export function useDirectoryList(): DirectoryListView {
  const copy = useCopy();
  const words = copy.directory;
  const english = useLanguage() === 'en';
  const filters = useDirectoryFilters();
  const near = useNearMe();
  const point = near.state.sorting ? near.state.point : null;
  const query = useDirectoryQuery(
    point === null
      ? filters.request
      : requestOf(filters.filters, english ? 'en' : 'ar', { byDistance: true }),
    point,
  );
  const answer = query.data;

  const retry = () => {
    void query.refetch();
  };
  const failure = useFailureView(
    answer === undefined ? query.error : null,
    words.loadFailed,
    retry,
  );
  const refreshFailure = useFailureView(
    answer !== undefined && query.isError ? query.error : null,
    words.refreshFailed,
    retry,
  );

  // A page past the last (as after spaces left the directory) shows the last page in its place.
  const pastLast = usePageInRange({
    answer,
    placeholder: query.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });

  const searching = filters.filters.q !== undefined;
  const chosen: DirectoryOrder = filters.filters.sort ?? (searching ? 'relevance' : 'updated');
  const orders: DirectoryOrder[] = searching
    ? ['relevance', 'updated', 'name']
    : ['updated', 'name'];
  const order: DirectorySort = point === null ? chosen : 'distance';
  const shownOrders: DirectorySort[] = point === null ? orders : ['distance', ...orders];
  // The count is worded from a real answer only: while the shown answer is the one before, the
  // live region keeps its last line rather than announce the old total under the new filters. A
  // count of none draws no line: the empty directory's or no match's own state says it.
  const settled =
    answer === undefined || query.isPlaceholderData
      ? null
      : answer.meta.totalRecords === 0
        ? ''
        : filters.anyApplied
          ? words.count.matching({ count: answer.meta.totalRecords })
          : words.count.all({ count: answer.meta.totalRecords });
  const [count, setCount] = useState('');
  if (settled !== null && settled !== count) setCount(settled);

  const panel = useFiltersPanel({
    filters: filters.filters,
    apply: filters.apply,
    applied: filters.applied,
    clear: filters.clearFilters,
    total: answer === undefined || query.isPlaceholderData ? undefined : answer.meta.totalRecords,
  });

  const { replacePage } = filters;
  const status = useLocationStatus({
    view: 'list',
    state: near.state,
    stop: near.stop,
    clear: near.clear,
    // «اختر منطقتك»: the place filter, in the sidebar from 1024 px, else in the opened sheet.
    chooseArea: () => {
      if (panel.wide) focusFilters();
      else panel.sheet.setOpen(true);
    },
    // A point set by hand: on the map, with every filter kept.
    pickOnMap: () => {
      near.startPick();
      filters.apply({ view: 'map' });
    },
  });

  const now = new Date();
  // A distance only while the list is ordered by distance, never from an answer kept once it stops.
  const byDistance = point !== null;
  const cards = (answer?.data ?? []).map((space) =>
    cardViewOf(space, { english, now, copy, byDistance }),
  );

  return {
    search: {
      label: words.search.label,
      placeholder: words.search.placeholder,
      text: filters.search.text,
      change: filters.search.change,
      error: filters.search.refused ? words.search.refused : null,
    },
    sort: {
      label: words.sort.label,
      valueText: words.sort.value({ sort: words.sort.options[order] }),
      value: order,
      options: shownOrders.map((value) => ({ value, label: words.sort.options[value] })),
      choose: (value) => {
        const next = orders.find((candidate) => candidate === value);
        if (next === undefined) return;
        if (point !== null) near.stop();
        filters.apply({ sort: next });
      },
    },
    count,
    filters: panel,
    near: {
      button: {
        label: words.near.button,
        on: point !== null,
        locating: near.state.status === 'locating',
        // Another order, back on the first page, as a change of order is.
        press: () => {
          if (filters.filters.page !== 1) replacePage(1);
          near.press();
        },
      },
      status,
    },
    results: {
      heading: words.results,
      busy: answer !== undefined && query.isFetching,
      state:
        query.isPending || pastLast
          ? 'loading'
          : answer === undefined
            ? 'failed'
            : cards.length > 0
              ? 'ready'
              : filters.anyApplied
                ? 'noMatch'
                : 'empty',
      cards,
      failure,
      refreshFailure,
      empty: { title: words.empty.title, text: words.empty.text },
      noMatch: {
        title: words.noMatch.title,
        text: words.noMatch.text,
        // «مسح الفلاتر» takes off the filters, as the sheet's does, keeping the search and the
        // order; when the search alone finds nothing, it takes off the search.
        clear: {
          label: words.clearFilters,
          run: filters.applied > 0 ? panel.sheet.clear.run : filters.clearSearch,
        },
      },
    },
    page: answer?.meta.currentPage ?? filters.filters.page,
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
  };
}

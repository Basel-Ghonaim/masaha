import type { PaginationView } from '@shared/lists';
import type { FiltersView } from './FiltersView';
import type { LocationStatusView } from './LocationStatusView';
import type { SpaceCardView } from './SpaceCardView';

/** A failure to load the list, or to refresh it over the cards shown: its words and its retry. */
export type ListFailureView = {
  title: string;
  line: string;
  reference: string | null;
  retry: { label: string; run: () => void; blocked: boolean };
};

/** The directory's list, ready to render: the toolbar, the count, the results and the pages. */
export type DirectoryListView = {
  search: {
    label: string;
    placeholder: string;
    text: string;
    change: (text: string) => void;
    error: string | null;
  };
  sort: {
    label: string;
    valueText: string;
    value: string;
    options: { value: string; label: string }[];
    choose: (value: string) => void;
  };
  /** Empty until the first answer; worded from a real answer, never the one shown meanwhile. */
  count: string;
  filters: FiltersView;
  /** «الأقرب إليّ» and its state line. */
  near: {
    button: { label: string; on: boolean; locating: boolean; press: () => void };
    status: LocationStatusView;
  };
  results: {
    heading: string;
    /** A fetch is in flight over the cards shown. */
    busy: boolean;
    state: 'loading' | 'failed' | 'empty' | 'noMatch' | 'ready';
    cards: SpaceCardView[];
    failure: ListFailureView | null;
    refreshFailure: ListFailureView | null;
    empty: { title: string; text: string };
    noMatch: { title: string; text: string; clear: { label: string; run: () => void } };
  };
  page: number;
  pagination: PaginationView | null;
};

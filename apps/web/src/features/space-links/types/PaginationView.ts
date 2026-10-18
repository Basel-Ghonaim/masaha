import type { PageItem } from '../services/pageItems';

/** A step to the page before or after: its words, and its address, or none when there is no page. */
type PaginationStep = { label: string; search: string | null };

/** A paged list's pages, ready to render: each a link to its own address, and the gaps between. */
export type PaginationView = {
  label: string;
  more: string;
  summary: string;
  previous: PaginationStep;
  next: PaginationStep;
  items: (
    | { kind: 'page'; page: number; label: string; search: string; current: boolean }
    | { kind: 'gap'; key: Exclude<PageItem, number> }
  )[];
};

import { announcementsQuerySchema, type AnnouncementState } from '@masaha/shared/announcements';
import { DEFAULT_PAGE_SIZE } from '@masaha/shared/core';

/** The list's tab and page, as the address holds them (S8). */
export type AnnouncementsFilters = { state: AnnouncementState; page: number };

/** The address's word for a tab; running, the default, is never written. */
const WORDS: Record<Exclude<AnnouncementState, 'RUNNING'>, string> = {
  UPCOMING: 'upcoming',
  ENDED: 'ended',
};

/**
 * The list's tab and page from the address (`?state=upcoming|ended&page=`, S8): running when the
 * state is missing or not one of the two, the page read by the contract's own rule, else the first.
 * The query is the tab with the page and its size, 20.
 */
export function announcementsQueryOf(params: URLSearchParams): {
  filters: AnnouncementsFilters;
  query: { state: AnnouncementState; page: number; limit: number };
} {
  const word = params.get('state');
  const state =
    word === WORDS.UPCOMING ? 'UPCOMING' : word === WORDS.ENDED ? 'ENDED' : ('RUNNING' as const);
  const read = announcementsQuerySchema.shape.page.safeParse(params.get('page') ?? undefined);
  const page = read.success ? read.data : 1;
  return { filters: { state, page }, query: { state, page, limit: DEFAULT_PAGE_SIZE } };
}

/** The address of a tab and page, the defaults left out. */
export function paramsOf({ state, page }: AnnouncementsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (state !== 'RUNNING') params.set('state', WORDS[state]);
  if (page !== 1) params.set('page', String(page));
  return params;
}

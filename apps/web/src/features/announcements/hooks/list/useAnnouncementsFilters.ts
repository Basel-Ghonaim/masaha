import type { AnnouncementState } from '@masaha/shared/announcements';
import { useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import {
  announcementsQueryOf,
  paramsOf,
  type AnnouncementsFilters,
} from '../../services/announcementsQueryOf';

const addressOf = (params: URLSearchParams) => {
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

/**
 * The list's tab and page, kept in the address so a link, a reload or Back shows the same list
 * (S8): a value the server would refuse falls back to running. Choosing a tab replaces the address,
 * so Back leaves the page rather than stepping through tabs, and returns to the first page. The
 * pages are links of their own (`searchOf`).
 */
export function useAnnouncementsFilters() {
  const [params, setParams] = useSearchParams();
  const { filters, query } = announcementsQueryOf(params);
  // The address as it stands, for two changes in one event, each written before it has rendered.
  const latest = useRef(params);
  useLayoutEffect(() => {
    latest.current = params;
  }, [params]);

  const write = (next: AnnouncementsFilters) => {
    latest.current = paramsOf(next);
    setParams(latest.current, { replace: true });
  };

  return {
    filters,
    query,
    /** Shows a tab, from its first page. */
    choose: (state: AnnouncementState) => {
      write({ state, page: 1 });
    },
    /** The address of a page, the tab kept. */
    searchOf: (page: number) => addressOf(paramsOf({ ...filters, page })),
    /** Shows another page in place of this one, such as the last when this one is past it. */
    replacePage: (page: number) => {
      write({ ...announcementsQueryOf(latest.current).filters, page });
    },
  };
}

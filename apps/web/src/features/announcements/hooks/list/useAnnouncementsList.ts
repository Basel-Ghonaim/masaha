import {
  ANNOUNCEMENT_STATES,
  type AnnouncementState,
  type AnnouncementsQuery,
  type AnnouncementsSummary,
  type ManagedAnnouncement,
} from '@masaha/shared/announcements';
import { gazaClockOf } from '@masaha/shared/core';
import type { Page } from '@shared/api';
import { useCopy, type Catalogue } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { dayText } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createAnnouncementsRepository } from '../../repository/announcementsRepository';
import { periodText } from '../../services/periodText';
import { textOf } from '../../services/textOf';
import { typeView } from '../../services/typeView';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import { announcementsKeys } from '../queryKeys';
import { useAnnouncementsFilters } from './useAnnouncementsFilters';

const repository = createAnnouncementsRepository();

/** The summary's count of each state. */
const COUNTS: Record<AnnouncementState, keyof AnnouncementsSummary> = {
  RUNNING: 'running',
  UPCOMING: 'upcoming',
  ENDED: 'ended',
};

/** The tabs' counts. */
function useSummaryQuery(spaceId: number) {
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  return useQuery<AnnouncementsSummary, AppError>({
    queryKey: announcementsKeys.summary(spaceId),
    queryFn: () => repository.summary(spaceId),
  });
}

/** A page of one state's announcements; the page before stays shown while the next loads. */
function useListQuery(spaceId: number, query: AnnouncementsQuery) {
  return useQuery<Page<ManagedAnnouncement[]>, AppError>({
    queryKey: announcementsKeys.list(spaceId, query.state, query.page),
    queryFn: () => repository.list(spaceId, query),
    placeholderData: keepPreviousData,
  });
}

/**
 * «الإعلانات» (screen 18), ready to render, for the owner or reception (`owner`, the role at the
 * space in the address): the tabs «نشطة · مجدولة · منتهية», each with the summary's count (a
 * skeleton while it loads), the tab and the page in the address (S8); each announcement a card — its
 * type (DI-15), its period on Gaza's clock (S9), its text in the interface's language (DI-27) and a
 * closure's line (DI-28), with no status badge: the tab says it. Its states: loading (three skeleton
 * cards, DI-23), failed (the reference and a retry), failed again over the cards shown (they stay),
 * empty per tab; the pages only past one page (DI-26); while another page or tab loads the cards
 * shown stay, the list marked busy.
 */
export function useAnnouncementsList(spaceId: number, { owner }: { owner: boolean }) {
  const copy = useCopy();
  const words = copy.announcements;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const filters = useAnnouncementsFilters();
  const { state: tab, page } = filters.filters;
  const summary = useSummaryQuery(spaceId).data;
  const query = useListQuery(spaceId, filters.query);
  const answer = query.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? query.error : null,
    words.list.loadFailed,
  );
  const pastLast = usePageInRange({
    answer,
    placeholder: query.isPlaceholderData,
    page,
    replacePage: filters.replacePage,
  });

  const now = new Date();
  const cards: AnnouncementCardView[] = (answer?.data ?? []).map((announcement) => {
    const { label, tone } = typeView(announcement.type, words);
    return {
      key: String(announcement.id),
      id: announcement.id,
      announcement,
      type: { label, tone },
      period: periodText(announcement, language, now, words.period),
      text: textOf(announcement, language),
      closureLine: closureLine(announcement, owner, words, language),
      // The owner's, on a closure that has started and whose subscriptions were not extended (O11).
      extension:
        owner &&
        announcement.type === 'CLOSURE' &&
        announcement.state !== 'UPCOMING' &&
        (announcement.extension ?? null) === null
          ? { label: words.extension.action }
          : null,
      edit: announcement.state === 'ENDED' ? null : { label: words.actions.edit },
    };
  });

  return {
    tabsLabel: words.tabs.label,
    tabs: ANNOUNCEMENT_STATES.map((value) => ({
      value,
      label: words.tabs[value],
      count: summary === undefined ? null : summary[COUNTS[value]],
    })),
    tab,
    /** Shows a tab, from its first page. */
    choose: (value: string) => {
      const state = ANNOUNCEMENT_STATES.find((each) => each === value);
      if (state !== undefined) filters.choose(state);
    },
    /** «إعلان جديد», at the end of the tabs' row and in an empty tab. */
    create: { label: words.actions.new },
    listLabel: words.list.label,
    state:
      query.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : cards.length > 0
            ? ('ready' as const)
            : ('empty' as const),
    cards,
    /** Another page or tab is loading, the cards shown meanwhile those already there. */
    busy: query.isPlaceholderData,
    empty: { title: words.empty[tab], text: words.empty.text },
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.list.pagination,
      searchOf: filters.searchOf,
    }),
    failure: {
      title: words.list.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
    refreshFailure:
      answer !== undefined && query.isError ? copy.occupancy.present.refreshFailed : null,
  };
}

/**
 * A closure's line about its subscriptions' extension (DI-28): once extended, how many, by how many
 * days, by whom and when; else the owner's on one not started yet, reception's on one started.
 */
function closureLine(
  { type, state, extension }: ManagedAnnouncement,
  owner: boolean,
  words: Catalogue['announcements'],
  language: 'ar' | 'en',
): string | null {
  if (type !== 'CLOSURE') return null;
  // Extended: how many, by how many days, by whom, when — to both roles.
  if (extension !== undefined && extension !== null) {
    return words.extension.line({
      count: words.extension.count({ count: extension.subscriptions }),
      days: words.extension.dayCount({ count: extension.days }),
      name: isolate(extension.appliedBy.name),
      date: dayText(gazaClockOf(new Date(extension.appliedAt)).date, language),
    });
  }
  if (state === 'UPCOMING') return owner ? words.closure.upcoming : null;
  return owner ? null : words.closure.reception;
}

/** «الإعلانات», ready to render. */
export type AnnouncementsListView = ReturnType<typeof useAnnouncementsList>;

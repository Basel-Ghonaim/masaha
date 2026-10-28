import type { MyReport } from '@masaha/shared/data-reports';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { spaceNameOf } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import { REPORT_CHIPS, type ReportChip } from '../../services/reportsQueryOf';
import { fieldLabel, reportDay, statusView } from '../../services/reportView';
import type { MyReportCardView } from '../../types/MyReportCardView';
import { dataReportsKeys } from '../queryKeys';
import { useSpaceReportsFilters } from '../space/useSpaceReportsFilters';

const repository = createDataReportsRepository();

/** A message longer than this is folded to two lines, with its toggle (DI-54). */
const FOLDED_FROM = 160;

/**
 * «بلاغاتي» (screen 11), ready to render: the user's own reports 20 a page, newest first, by «الكل ·
 * قيد المراجعة · تمت المراجعة» — the chip and the page in the address, a chip choice back to the first
 * page (S8, DI-55), the owner's list's own rule. Each report its space (a link while it is listed; its
 * name as text and C7's line once it left), its field and the day it was sent, its status as the
 * reporter reads it, its message (folded when long, DI-54) and the reply labelled by who replied
 * (DI-56). Its states: loading, failed (the reference and a retry), failed again over the cards shown,
 * none sent yet (with «تصفّح المساحات», DI-53), none under a chip; while another page or chip loads
 * the cards shown stay, the list marked busy.
 */
export function useMyReports({ spaceLink }: { spaceLink: (slug: string) => string }) {
  const copy = useCopy();
  const words = copy.dataReports;
  const mine = words.mine;
  const english = useLanguage() === 'en';
  const messageIds = useId();
  // «بلاغاتي»'s address follows the owner's list's rule (`?status=open|decided&page=`).
  const filters = useSpaceReportsFilters();
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<Page<MyReport[]>, AppError>({
    queryKey: dataReportsKeys.mine(filters.query),
    queryFn: () => repository.myReports(filters.query),
    placeholderData: keepPreviousData,
  });
  const answer = result.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? result.error : null,
    mine.loadFailed,
  );
  const pastLast = usePageInRange({
    answer,
    placeholder: result.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });
  const now = new Date();
  const language = english ? 'en' : 'ar';
  const toggle = (id: number) => {
    setExpanded((before) => {
      const after = new Set(before);
      if (after.has(id)) after.delete(id);
      else after.add(id);
      return after;
    });
  };
  const cards = (answer?.data ?? []).map((report): MyReportCardView => {
    const open = expanded.has(report.id);
    const note = report.decision?.note ?? null;
    return {
      key: String(report.id),
      space: {
        name: spaceNameOf(report.space, english),
        link: report.space.listed ? spaceLink(report.space.slug) : null,
        gone: report.space.listed ? null : mine.gone,
      },
      meta: mine.meta({
        field: fieldLabel(report.field, words.fields),
        day: reportDay(report.createdAt, language, now),
      }),
      status: statusView(report.status, words.statuses, 'reporter'),
      message:
        report.message === null
          ? null
          : {
              id: `${messageIds}-${String(report.id)}`,
              text: report.message,
              toggle:
                Array.from(report.message).length > FOLDED_FROM
                  ? {
                      label: open ? mine.less : mine.more,
                      expanded: open,
                      run: () => {
                        toggle(report.id);
                      },
                    }
                  : null,
            },
      reply:
        report.decision === null || note === null
          ? null
          : {
              label:
                report.decision.repliedBy === 'SPACE'
                  ? words.sheet.replySpace
                  : words.sheet.replyTeam,
              text: note,
            },
    };
  });
  const { chip } = filters.filters;

  return {
    region: mine.region,
    chips: {
      label: mine.chips.label,
      value: chip,
      options: REPORT_CHIPS.map((value) => ({ value, label: mine.chips[value] })),
      choose: (value: ReportChip) => {
        filters.choose(value);
      },
    },
    count: answer === undefined ? undefined : words.count({ count: answer.meta.totalRecords }),
    state:
      result.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : cards.length > 0
            ? ('ready' as const)
            : chip === 'all'
              ? ('empty' as const)
              : ('none' as const),
    cards,
    /** Another page or chip is loading, the cards shown meanwhile those already there. */
    busy: result.isPlaceholderData,
    empty:
      chip === 'all'
        ? { title: mine.empty.title, text: mine.empty.text, browse: copy.site.browseSpaces }
        : { title: mine.none, text: null, browse: null },
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
    failure: {
      title: mine.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void result.refetch();
      },
    },
    refreshFailure:
      answer !== undefined && result.isError ? copy.occupancy.present.refreshFailed : null,
  };
}

/** The user's own reports, ready to render. */
export type MyReportsView = ReturnType<typeof useMyReports>;

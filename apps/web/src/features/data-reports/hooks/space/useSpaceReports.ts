import type { SpaceReport } from '@masaha/shared/data-reports';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { paginationView, usePageInRange } from '@shared/lists';
import { useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import {
  REPORT_CHIPS,
  reportsParamsOf,
  reportsQueryOf,
  type ReportChip,
} from '../../services/reportsQueryOf';
import { fieldLabel, messageView, reportDay, statusView } from '../../services/reportView';
import type { DecideTarget } from '../../types/DecideTarget';
import type { ReportRowView } from '../../types/ReportRowView';
import { dataReportsKeys } from '../queryKeys';
import { useSpaceReportsFilters } from './useSpaceReportsFilters';

const repository = createDataReportsRepository();

/** The first page of «الكل», as its chip reads it: the same key, the same cache. */
const ALL_FIRST = reportsQueryOf(reportsParamsOf({ chip: 'all', page: 1 })).query;

/**
 * «بلاغات البيانات», the owner's (screen 23), ready to render: the space's reports 20 a page, newest
 * first, by «الكل · جديدة · تمت المراجعة» (DI-31) — the chip and the page in the address (S8). Each
 * report its field, its message (or «لم يكتب المُبلِّغ تفاصيل.», DI-35), the day it was made and
 * never the time (DI-34), its status; the reporter is never named: «زائر» (O12). Its states:
 * loading, failed (the reference and a retry), failed again over the rows shown, empty, and a chip
 * that matches nothing (with «عرض الكل», DI-42); while another page or chip loads the rows shown
 * stay, the list marked busy. The report opened is the decision sheet's, read from the latest list
 * while it is on it, so a decision made elsewhere shows there too; gone from the page while the sheet
 * is open — decided elsewhere, met under «جديدة» — it is read from the first page of «الكل».
 */
export function useSpaceReports(spaceId: number) {
  const copy = useCopy();
  const words = copy.dataReports;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const filters = useSpaceReportsFilters();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<Page<SpaceReport[]>, AppError>({
    queryKey: dataReportsKeys.space(spaceId, filters.query),
    queryFn: () => repository.spaceReports(spaceId, filters.query),
    placeholderData: keepPreviousData,
  });
  const answer = result.data;
  const { view, blocked } = useRefusalView(
    answer === undefined ? result.error : null,
    words.loadFailed,
  );
  const pastLast = usePageInRange({
    answer,
    placeholder: result.isPlaceholderData,
    page: filters.filters.page,
    replacePage: filters.replacePage,
  });
  const [opened, setOpened] = useState<SpaceReport | null>(null);
  const now = new Date();
  const reports = answer?.data ?? [];
  const rows = reports.map((report): ReportRowView => {
    const day = reportDay(report.createdAt, language, now);
    return {
      key: String(report.id),
      id: report.id,
      field: fieldLabel(report.field, words.fields),
      message: messageView(report.message, words),
      day,
      byline: words.byline({ who: words.visitor, day }),
      status: statusView(report.status, words.statuses, 'staff'),
      open: {
        label: words.open,
        run: () => {
          setOpened(report);
        },
      },
    };
  });
  const { chip } = filters.filters;
  // The report opened, gone from the page shown (decided elsewhere, under «جديدة»): «الكل» holds it.
  const left =
    opened !== null &&
    answer !== undefined &&
    !result.isPlaceholderData &&
    !reports.some((report) => report.id === opened.id);
  const all = useQuery<Page<SpaceReport[]>, AppError>({
    queryKey: dataReportsKeys.space(spaceId, ALL_FIRST),
    queryFn: () => repository.spaceReports(spaceId, ALL_FIRST),
    enabled: left,
  });
  const latest =
    opened === null
      ? null
      : (reports.find((report) => report.id === opened.id) ??
        all.data?.data.find((report) => report.id === opened.id) ??
        opened);
  const sheet: DecideTarget | null =
    latest === null ? null : { audience: 'owner', spaceId, report: latest };

  return {
    label: words.space.label,
    intro: words.space.intro,
    columns: words.space.columns,
    chips: {
      label: words.chips.label,
      value: chip,
      options: REPORT_CHIPS.map((value) => ({ value, label: words.chips[value] })),
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
          : rows.length > 0
            ? ('ready' as const)
            : chip === 'all'
              ? ('empty' as const)
              : ('noMatch' as const),
    rows,
    /** Another page or chip is loading, the rows shown meanwhile those already there. */
    busy: result.isPlaceholderData,
    empty:
      chip === 'all'
        ? { title: words.empty.title, text: words.empty.text, showAll: null }
        : {
            title: words.noMatch,
            text: null,
            showAll: {
              label: words.showAll,
              run: () => {
                filters.choose('all');
              },
            },
          },
    pagination: paginationView({
      current: answer?.meta.currentPage ?? 1,
      total: answer?.meta.totalPages ?? 0,
      words: words.pagination,
      searchOf: filters.searchOf,
    }),
    failure: {
      title: words.loadFailed,
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
    /** The report open in the decision sheet, if any. */
    sheet,
    close: () => {
      setOpened(null);
    },
    /** «عرض» in a decision's toast: the reports decided (DI-41). */
    showDecided: () => {
      filters.choose('decided');
    },
  };
}

/** The owner's reports, ready to render. */
export type SpaceReportsView = ReturnType<typeof useSpaceReports>;

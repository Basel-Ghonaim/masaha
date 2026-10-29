import {
  DATA_REPORT_FIELDS,
  type AdminReport,
  type DataReportField,
} from '@masaha/shared/data-reports';
import type { Page } from '@shared/api';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { spaceNameOf } from '@shared/lib';
import { paginationView, usePageInRange } from '@shared/lists';
import { isolate, useLanguage } from '@shared/localisation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import { adminReportsParamsOf, adminReportsQueryOf } from '../../services/adminReportsQueryOf';
import { REPORT_CHIPS, type ReportChip } from '../../services/reportsQueryOf';
import { fieldLabel, messageView, reportDay, statusView } from '../../services/reportView';
import type { AdminReportRowView } from '../../types/AdminReportRowView';
import type { DecideTarget } from '../../types/DecideTarget';
import { dataReportsKeys } from '../queryKeys';
import { useAdminReportsFilters } from './useAdminReportsFilters';

const repository = createDataReportsRepository();

/** «كل الحقول»: no field filter, as a choice's value. */
const ALL = 'all';

/**
 * «بلاغات البيانات», the admin's (screen 28), ready to render: every space's reports 20 a page, newest
 * first, by status (the chips, DI-32), space and field — every filter and the page in the address
 * (S8), the space and the field in force shown as removable tags at every width with «مسح الفلاتر»
 * (DI-40). Each report its space (a link to its editor), field, message, the reporter by name (O12),
 * the day, the status and «يعالجه»: «الإدارة» while the space is unverified, «المالك» once verified
 * (DI-39; no filter of it, finding 167). An unverified space's report opens to be decided; a verified
 * one's opens read-only, «عرض» on its button (DI-38). Its states as the owner's list's; a filter that
 * matches nothing offers «عرض الكل», which takes every filter off.
 */
export function useAdminReports({
  editorLink,
}: {
  /** A space's editor, and the section where a field group is edited in it, as the page routes it. */
  editorLink: (spaceId: number, field?: DataReportField) => string;
}) {
  const copy = useCopy();
  const words = copy.dataReports;
  const admin = words.admin;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const filters = useAdminReportsFilters();
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const result = useQuery<Page<AdminReport[]>, AppError>({
    queryKey: dataReportsKeys.admin(filters.query),
    queryFn: () => repository.adminReports(filters.query),
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
  const [opened, setOpened] = useState<AdminReport | null>(null);
  const now = new Date();
  const english = language === 'en';
  const reports = answer?.data ?? [];
  const rows = reports.map((report): AdminReportRowView => {
    const day = reportDay(report.createdAt, language, now);
    const { verified } = report.space;
    return {
      key: String(report.id),
      id: report.id,
      field: fieldLabel(report.field, words.fields),
      message: messageView(report.message, words),
      day,
      byline: words.byline({ who: isolate(report.reporter.name), day }),
      status: statusView(report.status, words.statuses, 'staff'),
      open: {
        label: verified ? words.view : words.open,
        run: () => {
          setOpened(report);
        },
      },
      space: { name: spaceNameOf(report.space, english), link: editorLink(report.space.id) },
      reporter: report.reporter.name,
      handledBy: verified
        ? { label: admin.handledBy.owner, tone: 'neutral' }
        : { label: admin.handledBy.admin, tone: 'info' },
    };
  });
  const { chip, field, spaceId } = filters.filters;
  // The chosen space's name, from a report of it on the page; unknown while none is shown.
  const shownSpace = reports.find((report) => report.space.id === spaceId)?.space;
  const chosenName =
    spaceId === undefined || shownSpace === undefined ? null : spaceNameOf(shownSpace, english);
  // The report opened, gone from the page shown (decided elsewhere, under «جديدة»): the first page of
  // «الكل», with the same space and field, holds it — the chip's own key and cache.
  const left =
    opened !== null &&
    answer !== undefined &&
    !result.isPlaceholderData &&
    !reports.some((report) => report.id === opened.id);
  const allFirst = adminReportsQueryOf(
    adminReportsParamsOf({ ...filters.filters, chip: 'all', page: 1 }),
  ).query;
  const all = useQuery<Page<AdminReport[]>, AppError>({
    queryKey: dataReportsKeys.admin(allFirst),
    queryFn: () => repository.adminReports(allFirst),
    enabled: left,
  });
  const latest =
    opened === null
      ? null
      : (reports.find((report) => report.id === opened.id) ??
        all.data?.data.find((report) => report.id === opened.id) ??
        opened);
  const sheet: Extract<DecideTarget, { audience: 'admin' }> | null =
    latest === null ? null : { audience: 'admin', report: latest };
  const total = answer?.meta.totalRecords ?? 0;
  const any = filters.applied > 0 || chip !== 'all';
  const clear = filters.applied > 0 ? { label: admin.tags.clear, run: filters.clear } : null;
  const fieldText = field === undefined ? null : fieldLabel(field, words.fields);

  return {
    label: admin.label,
    intro: admin.intro,
    columns: admin.columns,
    chips: {
      label: words.chips.label,
      value: chip,
      options: REPORT_CHIPS.map((value) => ({ value, label: words.chips[value] })),
      choose: (value: ReportChip) => {
        filters.apply({ chip: value });
      },
    },
    filters: {
      space: {
        label: admin.space,
        value: spaceId,
        chosenName,
        chosenFallback: admin.chosen,
        choose: (value: number | undefined) => {
          filters.apply({ spaceId: value });
        },
      },
      field: {
        label: admin.field,
        value: field ?? ALL,
        options: [
          { value: ALL, label: admin.allFields },
          ...DATA_REPORT_FIELDS.map((value) => ({ value, label: words.fields[value] })),
        ],
        choose: (value: string) => {
          filters.apply({ field: DATA_REPORT_FIELDS.find((each) => each === value) });
        },
      },
      /** The phone's sheet that holds the space and the field. */
      sheet: {
        title: admin.filters.title,
        label:
          filters.applied > 0
            ? copy.payments.ledger.filters.applied({ count: filters.applied })
            : admin.filters.title,
        count: filters.applied,
        show:
          answer !== undefined && total === 0
            ? admin.filters.none
            : admin.filters.show({ count: total }),
        clear: { label: admin.tags.clear, run: filters.clear },
        closeLabel: words.sheet.close,
      },
    },
    /** The space and the field in force, each removable, at every width (DI-40). */
    tags: [
      ...(spaceId === undefined
        ? []
        : [
            {
              key: 'space',
              label: admin.tags.space({ name: isolate(chosenName?.text ?? admin.chosen) }),
              removeLabel: admin.tags.removeSpace,
              remove: () => {
                filters.apply({ spaceId: undefined });
              },
            },
          ]),
      ...(fieldText === null
        ? []
        : [
            {
              key: 'field',
              label: admin.tags.field({ field: fieldText }),
              removeLabel: admin.tags.removeField,
              remove: () => {
                filters.apply({ field: undefined });
              },
            },
          ]),
    ],
    /** «مسح الفلاتر», while the space or the field applies. */
    clear,
    count: answer === undefined ? undefined : words.count({ count: total }),
    state:
      result.isPending || pastLast
        ? ('loading' as const)
        : answer === undefined
          ? ('failed' as const)
          : rows.length > 0
            ? ('ready' as const)
            : any
              ? ('noMatch' as const)
              : ('empty' as const),
    rows,
    /** Another page or filter is loading, the rows shown meanwhile those already there. */
    busy: result.isPlaceholderData,
    empty: any
      ? {
          title: words.noMatch,
          text: null,
          showAll: { label: words.showAll, run: filters.showAll },
        }
      : { title: words.empty.title, text: null, showAll: null },
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
    /** Where the sheet's «تعديل الحقل» leads, or a verified space's «عرض المساحة». */
    editLinkOf: (target: AdminReport) =>
      target.space.verified
        ? editorLink(target.space.id)
        : editorLink(target.space.id, target.field),
    close: () => {
      setOpened(null);
    },
    /** «عرض» in a decision's toast: the reports decided, the other filters kept (DI-41). */
    showDecided: () => {
      filters.apply({ chip: 'decided' });
    },
  };
}

/** The admin's reports, ready to render. */
export type AdminReportsView = ReturnType<typeof useAdminReports>;

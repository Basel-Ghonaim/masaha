import type { AdminReport, SpaceReport } from '@masaha/shared/data-reports';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView } from '@shared/forms';
import { useLanguage } from '@shared/localisation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import { NOTICE_GROUPS } from '../../services/noticeGroup';
import { fieldLabel, messageView, reportDay } from '../../services/reportView';
import type { ReportNoticeView } from '../../types/ReportNoticeView';
import { dataReportsKeys } from '../queryKeys';

const repository = createDataReportsRepository();

/**
 * Whose notice it is, on which space's editor, and where its reports list is: the owner's, read
 * on the managed route, or the admin's.
 */
export type ReportNoticeScope = {
  audience: 'owner' | 'admin';
  spaceId: number;
  /** The reports list's path, as the page routes it: «فتح البلاغ للرد» adds `?open={id}`. */
  reportsPath: string;
};

/**
 * The notice of the report the address names (`reportId`, `?report=`), read by its id (S5), never
 * searched for in a page of the list: its field's section (`group`), «بلاغ مفتوح على {field}», its
 * words quoted with who reported — «زائر» to the owner (O12), the reporter's name to the admin — and
 * its day; «تم التصحيح» marks it corrected in place (`RESOLVED`, no reply), then the notice says so
 * with the way back to the reports. A report decided already, of another space, not found, or —
 * for the admin — a verified space's (its owner decides it) draws nothing, nor does one still loading.
 */
export function useReportNotice(
  scope: ReportNoticeScope,
  reportId: number | undefined,
): ReportNoticeView | null {
  const copy = useCopy();
  const words = copy.dataReports;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const client = useQueryClient();
  const { audience, spaceId, reportsPath } = scope;
  const id = reportId ?? 0;
  const query = useQuery<SpaceReport | AdminReport, AppError>({
    queryKey:
      audience === 'owner' ? dataReportsKeys.spaceOne(spaceId, id) : dataReportsKeys.adminOne(id),
    queryFn: () =>
      audience === 'owner' ? repository.spaceReport(spaceId, id) : repository.adminReport(id),
    enabled: reportId !== undefined,
    // A report that is not found stays not found: no retry, no notice.
    retry: false,
  });
  // Marked here: the notice says so, whatever the report reads as since.
  const [resolved, setResolved] = useState(false);
  const resolving = useMutation<SpaceReport | AdminReport, AppError>({
    mutationFn: () =>
      audience === 'owner'
        ? repository.decideSpace(spaceId, id, { status: 'RESOLVED' })
        : repository.decideAdmin(id, { status: 'RESOLVED' }),
    onSuccess: () => {
      setResolved(true);
      void client.invalidateQueries({
        queryKey:
          audience === 'owner' ? dataReportsKeys.spaceAll(spaceId) : dataReportsKeys.adminAll(),
      });
    },
    onError: (error) => {
      // Decided meanwhile, or gone: read it again, and the notice goes.
      if (error.code === 'REPORT_ALREADY_DECIDED' || error.status === 404) void query.refetch();
    },
  });
  const { view, blocked } = useRefusalView(resolving.error, words.notice.failed);

  const report = query.data;
  if (reportId === undefined || report === undefined) return null;
  const elsewhere = 'space' in report && (report.space.id !== spaceId || report.space.verified);
  if (elsewhere || (!resolved && report.status !== 'OPEN')) return null;

  const message = messageView(report.message, words);
  const day = reportDay(report.createdAt, language, new Date());
  const who = 'reporter' in report ? report.reporter.name : words.notice.visitor;
  const base = {
    group: NOTICE_GROUPS[report.field],
    title: words.notice.title({ field: fieldLabel(report.field, words.fields) }),
    said: {
      text: words.notice.said({
        text: message.none ? message.text : words.notice.quoted({ message: message.text }),
        who,
        day,
      }),
      message: { none: message.none },
    },
  };
  if (resolved) {
    return {
      ...base,
      state: 'resolved',
      line: words.notice.resolved,
      back: { label: words.notice.back, href: reportsPath },
    };
  }
  return {
    ...base,
    state: 'open',
    resolve: {
      label: words.notice.resolve,
      pending: resolving.isPending,
      blocked,
      run: () => {
        if (!resolving.isPending && !blocked) resolving.mutate();
      },
    },
    open: { label: words.notice.open, href: `${reportsPath}?open=${String(id)}` },
    failure: view,
  };
}

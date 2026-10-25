import type { DataReportStatus, DecideReportRequest } from '@masaha/shared/data-reports';

/** What a decision does to a report as it is now. */
export type DecisionOutcome = 'decide' | 'as-is' | 'conflict';

/**
 * Whether `actorId`'s decision may be written on the report: an open one is decided; one decided
 * already with the same status, the same reply and by the same person answers as it is, so a retry
 * after a lost answer is no refusal (S8); any other decision of a decided report conflicts — a
 * decided report is final (decision 11).
 */
export function decisionOf(
  report: {
    status: DataReportStatus;
    resolutionNote: string | null;
    resolvedById: number | null;
  },
  request: DecideReportRequest,
  actorId: number,
): DecisionOutcome {
  if (report.status === 'OPEN') return 'decide';
  const same =
    report.status === request.status &&
    report.resolutionNote === (request.note ?? null) &&
    report.resolvedById === actorId;
  return same ? 'as-is' : 'conflict';
}

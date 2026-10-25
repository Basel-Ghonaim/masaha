import type { DataReportDecision, DataReportField, DataReportStatus } from './requests.ts';

// The answers of the data reports' endpoints (docs/api/api-contract.md §5, Data reports).

/**
 * A report's decision: when, the reply, and who replied as it was stored with it — `SPACE` when its
 * owner decided, `MASAHA` when the admin did.
 */
export interface ReportDecision {
  status: DataReportDecision;
  at: string;
  note: string | null;
  repliedBy: 'SPACE' | 'MASAHA';
}

/** A report as its space's owner sees it: never who reported it. */
export interface SpaceReport {
  id: number;
  field: DataReportField;
  message: string | null;
  createdAt: string;
  status: DataReportStatus;
  /** `null` while it is open. */
  decision: ReportDecision | null;
}

/**
 * A report as its reporter sees it, with its space: `listed: false` once the space left the
 * directory, its name still shown.
 */
export type MyReport = SpaceReport & {
  space: { id: number; slug: string; nameEn: string; nameAr: string | null; listed: boolean };
};

/** A report as the admin sees it: who reported it, who decided it, and whether its space is verified. */
export type AdminReport = SpaceReport & {
  space: { id: number; slug: string; nameEn: string; nameAr: string | null; verified: boolean };
  reporter: { id: number; name: string };
  decidedBy: { id: number; name: string } | null;
};

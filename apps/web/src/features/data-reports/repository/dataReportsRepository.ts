import type { SuccessEnvelope } from '@masaha/shared/core';
import type {
  AdminReport,
  AdminReportsQuery,
  CreateReportRequest,
  DecideReportRequest,
  MyReport,
  MyReportsQuery,
  SpaceReport,
  SpaceReportsQuery,
} from '@masaha/shared/data-reports';
import { api, apiClient, unwrap, type Page } from '@shared/api';

/** A space's reports, below its managed path (docs/api/api-contract.md §5, Data reports). */
const spaceReportsPath = (spaceId: number) => `/manage/spaces/${String(spaceId)}/data-reports`;
/** Every space's reports, below the admin's path. */
const ADMIN_REPORTS_PATH = '/admin/data-reports';

/**
 * The data reports on the server (docs/api/api-contract.md §5, Data reports): the owner's list of a
 * space's reports and the owner's decision; the admin's list of every space's and the admin's
 * decision. Each audience's calls are its own, side by side.
 */
export interface DataReportsRepository {
  /** A page of the space's reports the query finds, newest first; never who reported them. */
  spaceReports(spaceId: number, query: SpaceReportsQuery): Promise<Page<SpaceReport[]>>;
  /** The owner's decision of one of the space's reports, with its reply or none. */
  decideSpace(spaceId: number, reportId: number, body: DecideReportRequest): Promise<SpaceReport>;
  /** A page of every space's reports the query finds, newest first, with who reported each. */
  adminReports(query: AdminReportsQuery): Promise<Page<AdminReport[]>>;
  /** The admin's decision of an unverified space's report, with its reply or none. */
  decideAdmin(reportId: number, body: DecideReportRequest): Promise<AdminReport>;
  /** A page of the signed-in user's own reports, newest first, each with its space and its reply. */
  myReports(query: MyReportsQuery): Promise<Page<MyReport[]>>;
  /**
   * A report of a listed space's wrong information, by its slug: `repeated` when the server answered
   * with the user's open report of that space and field (200) rather than a new one (201) — the rare
   * call that reads the answer's status (S15).
   */
  report(slug: string, body: CreateReportRequest): Promise<{ report: MyReport; repeated: boolean }>;
}

export function createDataReportsRepository(): DataReportsRepository {
  return {
    spaceReports: (spaceId, query) =>
      api.getPage<SpaceReport[]>(spaceReportsPath(spaceId), { params: query }),
    decideSpace: (spaceId, reportId, body) =>
      api.patch<SpaceReport>(`${spaceReportsPath(spaceId)}/${String(reportId)}`, body),
    adminReports: (query) => api.getPage<AdminReport[]>(ADMIN_REPORTS_PATH, { params: query }),
    decideAdmin: (reportId, body) =>
      api.patch<AdminReport>(`${ADMIN_REPORTS_PATH}/${String(reportId)}`, body),
    myReports: (query) => api.getPage<MyReport[]>('/me/reports', { params: query }),
    report: async (slug, body) => {
      const response = await apiClient.post<SuccessEnvelope<MyReport>>(
        `/spaces/${encodeURIComponent(slug)}/reports`,
        body,
      );
      return { report: unwrap(response), repeated: response.status === 200 };
    },
  };
}

import type {
  DecideReportRequest,
  SpaceReport,
  SpaceReportsQuery,
} from '@masaha/shared/data-reports';
import { api, type Page } from '@shared/api';

/** A space's reports, below its managed path (docs/api/api-contract.md §5, Data reports). */
const spaceReportsPath = (spaceId: number) => `/manage/spaces/${String(spaceId)}/data-reports`;

/**
 * The data reports on the server (docs/api/api-contract.md §5, Data reports): the owner's list of a
 * space's reports and the owner's decision. Each audience's calls are its own, side by side.
 */
export interface DataReportsRepository {
  /** A page of the space's reports the query finds, newest first; never who reported them. */
  spaceReports(spaceId: number, query: SpaceReportsQuery): Promise<Page<SpaceReport[]>>;
  /** The owner's decision of one of the space's reports, with its reply or none. */
  decideSpace(spaceId: number, reportId: number, body: DecideReportRequest): Promise<SpaceReport>;
}

export function createDataReportsRepository(): DataReportsRepository {
  return {
    spaceReports: (spaceId, query) =>
      api.getPage<SpaceReport[]>(spaceReportsPath(spaceId), { params: query }),
    decideSpace: (spaceId, reportId, body) =>
      api.patch<SpaceReport>(`${spaceReportsPath(spaceId)}/${String(reportId)}`, body),
  };
}

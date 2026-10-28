import type { AdminReport, DecideReportRequest, SpaceReport } from '@masaha/shared/data-reports';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import type { DecideTarget } from '../../types/DecideTarget';
import { dataReportsKeys } from '../queryKeys';

const repository = createDataReportsRepository();

/**
 * The decision of the sheet's report, the owner's or the admin's. No key: the same decision again
 * answers the report as it is, so it is sent once and never again by itself (S4). Done, its
 * audience's reports are read again, never awaited (S3); `REPORT_ALREADY_DECIDED` and a report gone
 * read them again too, so the list and the sheet show the truth. The owner's link ended meanwhile (a
 * 404, or a 403 with no code) reads the user's own spaces again, so the switcher and the navigation
 * follow (S5); the admin's 403 — a space verified meanwhile — reads the admin's reports again.
 */
export function useDecideReport(target: DecideTarget) {
  const client = useQueryClient();
  const readAgain = () => {
    void client.invalidateQueries({
      queryKey:
        target.audience === 'owner'
          ? dataReportsKeys.spaceAll(target.spaceId)
          : dataReportsKeys.adminAll(),
    });
  };
  return useMutation<SpaceReport | AdminReport, AppError, DecideReportRequest>({
    mutationFn: (body) =>
      target.audience === 'owner'
        ? repository.decideSpace(target.spaceId, target.report.id, body)
        : repository.decideAdmin(target.report.id, body),
    onSuccess: readAgain,
    onError: (error) => {
      if (error.code === 'REPORT_ALREADY_DECIDED' || error.status === 404) readAgain();
      if (target.audience === 'admin') {
        if (error.status === 403) readAgain();
        return;
      }
      if (error.status === 404 || (error.status === 403 && error.code === undefined)) {
        void client.invalidateQueries({ queryKey: ['me'] });
      }
    },
  });
}

import type { DecideReportRequest, SpaceReport } from '@masaha/shared/data-reports';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import type { DecideTarget } from '../../types/DecideTarget';
import { dataReportsKeys } from '../queryKeys';

const repository = createDataReportsRepository();

/**
 * The decision of the sheet's report. No key: the same decision again answers the report as it is,
 * so it is sent once and never again by itself (S4). Done, the space's reports are read again,
 * never awaited (S3); `REPORT_ALREADY_DECIDED` and a report gone read them again too, so the list and
 * the sheet show the truth; a link ended meanwhile (a 404, or a 403 with no code) reads the user's
 * own spaces again, so the switcher and the navigation follow (S5).
 */
export function useDecideReport(target: DecideTarget) {
  const client = useQueryClient();
  const { spaceId, report } = target;
  const readAgain = () => {
    void client.invalidateQueries({ queryKey: dataReportsKeys.spaceAll(spaceId) });
  };
  return useMutation<SpaceReport, AppError, DecideReportRequest>({
    mutationFn: (body) => repository.decideSpace(spaceId, report.id, body),
    onSuccess: readAgain,
    onError: (error) => {
      if (error.code === 'REPORT_ALREADY_DECIDED' || error.status === 404) readAgain();
      if (error.status === 404 || (error.status === 403 && error.code === undefined)) {
        void client.invalidateQueries({ queryKey: ['me'] });
      }
    },
  });
}

import type { CreateReportRequest, MyReport } from '@masaha/shared/data-reports';
import type { AppError } from '@shared/errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import { dataReportsKeys } from '../queryKeys';

const repository = createDataReportsRepository();

/**
 * A report of the space `slug`. No key: a repeat answers the open report (200), so it is sent once
 * and never again by itself (S4). Done, the user's reports are read again, never awaited (S3).
 */
export function useReport(slug: string) {
  const client = useQueryClient();
  return useMutation<{ report: MyReport; repeated: boolean }, AppError, CreateReportRequest>({
    mutationFn: (body) => repository.report(slug, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: dataReportsKeys.mineAll });
    },
  });
}

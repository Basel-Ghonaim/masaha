import { useQuery } from '@tanstack/react-query';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import { dataReportsKeys } from '../queryKeys';

const repository = createDataReportsRepository();

/**
 * The open reports the admin handles, counted for the admin's sidebar (G28.3): one row asked, its
 * page's total read. Read on mount and on the window's focus, never polled; every decision's
 * invalidation of the admin's reports reads it again. `undefined` until known.
 */
export function useAdminReportsCount(): number | undefined {
  const query = useQuery({
    queryKey: dataReportsKeys.adminWaitingCount(),
    queryFn: () =>
      repository.adminReports({ status: 'OPEN', handledBy: 'ADMIN', page: 1, limit: 1 }),
    select: (page) => page.meta.totalRecords,
  });
  return query.data;
}

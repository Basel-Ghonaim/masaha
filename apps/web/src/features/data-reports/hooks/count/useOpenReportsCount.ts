import { useQuery } from '@tanstack/react-query';
import { createDataReportsRepository } from '../../repository/dataReportsRepository';
import { dataReportsKeys } from '../queryKeys';

const repository = createDataReportsRepository();

/**
 * The space's open reports, counted for the owner's sidebar (G23.2): one row asked, its page's total
 * read. Read on mount and on the window's focus, never polled; every decision's invalidation of the
 * space's reports reads it again. Not read for reception (`enabled` false) nor for a space id that is
 * not one. `undefined` until known.
 */
export function useOpenReportsCount(
  spaceId: number | undefined,
  enabled: boolean,
): number | undefined {
  const id = spaceId ?? 0;
  const query = useQuery({
    queryKey: dataReportsKeys.spaceOpenCount(id),
    queryFn: () => repository.spaceReports(id, { status: 'OPEN', page: 1, limit: 1 }),
    enabled: enabled && id > 0,
    select: (page) => page.meta.totalRecords,
  });
  return query.data;
}

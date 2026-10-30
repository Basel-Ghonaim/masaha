import type { Page } from '@shared/api';
import type { AppError } from '@shared/errors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createDeskRepository } from '../../repository/deskRepository';
import { logRows } from '../../services/logRows';
import type { LogEntry } from '../../types/LogEntry';
import { deskKeys } from '../queryKeys';

const repository = createDeskRepository();

/** Every page of a paged read, one after another: a day is bounded (S6). */
async function whole<T>(read: (page: number) => Promise<Page<T[]>>): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page += 1) {
    const answer = await read(page);
    all.push(...answer.data);
    if (page >= answer.meta.totalPages) return all;
  }
}

/**
 * A day's log (K8, S6, DI24): the day's visits and its subscribers' check-ins, each read whole, then
 * merged, the latest check-in first. `day` is the owner's chosen Gaza date; `null` is today, read
 * as reception must, with no range for the visits (`today` names the check-ins' day). Read again
 * after any desk write (S2); the day before stays shown while the next one loads.
 */
export function useDayLogQuery(spaceId: number, day: string | null, today: string) {
  return useQuery<LogEntry[], AppError>({
    queryKey: deskKeys.log(spaceId, day),
    queryFn: async () => {
      const [visits, checkIns] = await Promise.all([
        whole((page) => repository.dayVisits(spaceId, day, page)),
        whole((page) => repository.dayCheckIns(spaceId, day ?? today, page)),
      ]);
      return logRows(visits, checkIns);
    },
    placeholderData: keepPreviousData,
  });
}

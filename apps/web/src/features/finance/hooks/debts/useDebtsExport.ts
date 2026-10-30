import { gazaClockOf, MAX_PAGE_SIZE } from '@masaha/shared/core';
import type { BalanceRow } from '@masaha/shared/finance';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { useState } from 'react';
import { createFinanceRepository } from '../../repository/financeRepository';
import { debtsCsv } from '../../services/debtsCsv';

const repository = createFinanceRepository();

/**
 * The debts' export (D5.4): every page of who owes, 50 at a time, read in turn while it runs; then
 * the file, handed to `save`. A page that fails saves nothing and says so, with «إعادة المحاولة».
 */
export function useDebtsExport(
  spaceId: number,
  save: (file: { name: string; text: string }) => void,
) {
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const rows: BalanceRow[] = [];
      for (let page = 1; ; page += 1) {
        const answer = await repository.debts(spaceId, {
          state: 'OWES',
          page,
          limit: MAX_PAGE_SIZE,
        });
        rows.push(...answer.data);
        if (!answer.meta.hasNextPage) break;
      }
      const words = currentCopy().finance.debts;
      save(debtsCsv(rows, gazaClockOf(new Date()).date, { ...words.csv, items: words.owes.items }));
    } catch {
      const copy = currentCopy();
      toast.error(copy.finance.debts.exportFailed, {
        action: {
          label: copy.status.retry,
          onClick: () => {
            void run();
          },
        },
      });
    } finally {
      setRunning(false);
    }
  };

  return {
    running,
    run: () => {
      void run();
    },
  };
}

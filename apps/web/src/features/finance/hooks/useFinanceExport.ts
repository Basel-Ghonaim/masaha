import { gazaClockOf } from '@masaha/shared/core';
import { useCopy } from '@shared/copy';
import { downloadFile } from '@shared/lib';
import { toast } from '@shared/design-system';
import { incomeCsv } from '../services/incomeCsv';
import { occupancyCsv } from '../services/occupancyCsv';
import { useDebtsExport } from './debts/useDebtsExport';
import { useIncomeQuery } from './income/useIncomeQuery';
import { useOccupancyQuery } from './occupancy/useOccupancyQuery';
import { useFinanceTabs } from './useFinanceTabs';
import { useMoney } from './useMoney';

/**
 * The export of the tab shown (D5.3–D5.5), ready to render: its label, whether it can run (its
 * figures arrived), and the run — a CSV built in the browser from the figures read (the debts' from
 * every page, read in turn), saved on the owner's device, then «نُزّل الملف» with the file's name.
 */
export function useFinanceExport(spaceId: number) {
  const copy = useCopy();
  const words = copy.finance.export;
  const { language } = useMoney();
  const tabs = useFinanceTabs();
  // The tab shown's own read, shared with the tab: no read for a tab not shown.
  const income = useIncomeQuery(spaceId, tabs.asked, tabs.tab === 'income').data;
  const occupancy = useOccupancyQuery(spaceId, tabs.asked, tabs.tab === 'occupancy').data;

  const saved = (file: { name: string; text: string }) => {
    downloadFile(file.name, file.text);
    toast.success(words.done, { description: file.name });
  };

  const debts = useDebtsExport(spaceId, saved);

  if (tabs.tab === 'debts') {
    return {
      more: words.more,
      label: words.debts,
      disabled: false,
      loading: debts.running,
      run: debts.run,
    };
  }
  if (tabs.tab === 'occupancy') {
    return {
      more: words.more,
      label: words.occupancy,
      disabled: occupancy === undefined,
      loading: false,
      run: () => {
        if (occupancy !== undefined) {
          saved(
            occupancyCsv(occupancy, {
              today: gazaClockOf(new Date()).date,
              language,
              day: copy.finance.occupancy.csv.day,
            }),
          );
        }
      },
    };
  }
  return {
    more: words.more,
    label: words.income,
    disabled: income === undefined,
    loading: false,
    run: () => {
      if (income !== undefined) saved(incomeCsv(income, copy.finance.income.csv));
    },
  };
}

/** Finance's export, ready to render. */
export type FinanceExportView = ReturnType<typeof useFinanceExport>;

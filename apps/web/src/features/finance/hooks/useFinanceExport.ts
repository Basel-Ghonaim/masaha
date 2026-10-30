import { useCopy } from '@shared/copy';
import { downloadFile } from '@shared/lib';
import { toast } from '@shared/design-system';
import { incomeCsv } from '../services/incomeCsv';
import { useIncomeQuery } from './income/useIncomeQuery';
import { useFinanceTabs } from './useFinanceTabs';

/**
 * The export of the tab shown (D5.3–D5.5), ready to render: its label, whether it can run (its
 * figures arrived), and the run — a CSV built in the browser from the figures read, saved on the
 * owner's device, then «نُزّل الملف» with the file's name.
 */
export function useFinanceExport(spaceId: number) {
  const copy = useCopy();
  const words = copy.finance.export;
  const tabs = useFinanceTabs();
  // The tab shown's own read, shared with the tab: no read for a tab not shown.
  const income = useIncomeQuery(spaceId, tabs.asked, tabs.tab === 'income').data;

  const saved = (file: { name: string; text: string }) => {
    downloadFile(file.name, file.text);
    toast.success(words.done, { description: file.name });
  };

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

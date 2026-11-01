import { useCopy } from '@shared/copy';
import { monthLabel } from '../services/monthLabel';
import { FINANCE_TABS, useFinanceTabs, type FinanceTab } from './useFinanceTabs';
import { useMoney } from './useMoney';

/** Finance's tabs and its month (D5.3), ready to render, from the address. */
export function useFinanceScreen() {
  const copy = useCopy();
  const words = copy.finance;
  const { language } = useMoney();
  const tabs = useFinanceTabs();

  return {
    tab: tabs.tab,
    asked: tabs.asked,
    month: tabs.month,
    tabs: {
      label: words.tabs.label,
      items: FINANCE_TABS.map((value) => ({ value, label: words.tabs[value] })),
      choose: (value: string) => {
        const tab = FINANCE_TABS.find((choice) => choice === value);
        if (tab !== undefined) tabs.setTab(tab);
      },
    },
    monthField: {
      label: words.month,
      value: tabs.month,
      options: tabs.months.map((value) => ({ value, label: monthLabel(value, language) })),
      choose: tabs.setMonth,
    },
    /** Where the debts' lists stand, for the debts tab. */
    place: tabs,
  };
}

export type { FinanceTab };
